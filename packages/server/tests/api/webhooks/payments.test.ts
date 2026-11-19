import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import type { Nullable } from "@usenullish/nullish-common";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import type { ProcessPayments } from "@usenullish/nullish-schema/payments";
import { ErrorCode, PAYMENT_EVENT_MAX_SIZE } from "@usenullish/nullish-schema/server";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import { defineApi } from "../../../src/api";

describe("POST /payments/stripe/webhook", () => {
  const PAYLOAD = JSON.stringify({ id: "evt_1" });
  const SIGNATURE = "t=1,v1=signature";

  const handle = mock<ProcessPayments["handle"]>(async () => undefined);
  const checkout = mock<ProcessPayments["checkout"]>(async () => ({
    url: "https://checkout.stripe.com/c/pay/cs_1",
  }));
  const listPlans = mock<ProcessPayments["listPlans"]>(async () => []);

  let instance: DbInstance;

  const post = async ({
    payments = { handle, checkout, listPlans },
    body = PAYLOAD,
    headers = { "stripe-signature": SIGNATURE },
  }: {
    payments?: Nullable<ProcessPayments>;
    body?: string;
    headers?: Record<string, string>;
  } = {}) => {
    const { fetch } = defineApi({
      db: instance,
      jobs: {} as TriggerJobs,
      storage: FsStorageProvider.create(),
      mail: null,
      payments,
    });

    return await fetch(
      new Request("http://localhost/payments/stripe/webhook", { method: "POST", body, headers }),
    );
  };

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;
  });

  beforeEach(() => {
    handle.mockReset();
    handle.mockImplementation(async () => undefined);
  });

  afterEach(() => {
    mock.restore();
  });

  afterAll(async () => {
    await instance.close();
  });

  test("answers 503 without a payment provider", async () => {
    const response = await post({ payments: null });

    expect(response.status).toBe(503);
  });

  test("passes the raw payload and the signature to the provider", async () => {
    const response = await post();

    expect(response.status).toBe(204);
    expect(handle).toHaveBeenCalledWith({ payload: PAYLOAD, signature: SIGNATURE });
  });

  test("rejects an event without signature", async () => {
    const response = await post({ headers: {} });

    expect(response.status).toBe(400);
    expect(handle).not.toHaveBeenCalled();
  });

  test("rejects an event that is too large", async () => {
    const response = await post({ body: "a".repeat(PAYMENT_EVENT_MAX_SIZE + 1) });

    expect(response.status).toBe(413);
    expect(handle).not.toHaveBeenCalled();
  });

  test("hides the error of an event that cannot be handled", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    handle.mockImplementation(async () => {
      throw new Error("Secret detail");
    });

    const response = await post();

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "The payment event cannot be handled.",
      code: ErrorCode.UNEXPECTED,
    });
    expect(consoleError).toHaveBeenCalled();
  });
});
