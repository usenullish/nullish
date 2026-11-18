import { isEmptyString, isNullish, tryCatch } from "@usenullish/nullish-common";
import type { HandlePaymentEvent } from "@usenullish/nullish-schema/payments";
import { ErrorCode, PAYMENT_EVENT_MAX_SIZE } from "@usenullish/nullish-schema/server";
import { bodyLimit } from "hono/body-limit";
import { errorResponse } from "../_errors";
import type { DefineRawHandler } from "../types/raw-api";
import { Webhook, type WebhookArgs, WebhookProvider } from "./_factories/webhook";

type PaymentsWebhookArgs = Omit<WebhookArgs, "path"> & { payments: HandlePaymentEvent };

@WebhookProvider
export class PaymentsWebhook extends Webhook {
  readonly #payments: HandlePaymentEvent;

  private constructor({ app, payments }: PaymentsWebhookArgs) {
    super({ path: "/payments/stripe/webhook", app });

    this.#payments = payments;
  }

  static create(args: PaymentsWebhookArgs): PaymentsWebhook {
    return new this(args);
  }

  override register(): void {
    this.app.post(
      this.path,
      bodyLimit({
        maxSize: PAYMENT_EVENT_MAX_SIZE,
        onError: (context) =>
          errorResponse({
            context,
            error: "The payment event is too large.",
            code: ErrorCode.LIMITED,
            status: 413,
          }),
      }),
      this.#handle,
    );
  }

  #handle: DefineRawHandler = async (context) => {
    const signature = context.req.header("stripe-signature");

    if (isEmptyString(signature)) {
      return errorResponse({
        context,
        error: "The signature of the payment event is missing.",
        code: ErrorCode.VALIDATION,
        status: 400,
      });
    }

    const payload = await context.req.text();

    const result = await tryCatch(async () => {
      return await this.#payments.handle({ payload, signature });
    });

    if (result.status === "error") {
      console.error("Cannot handle the payment event:", result.err);

      return errorResponse({
        context,
        error: "The payment event cannot be handled.",
        code: ErrorCode.UNEXPECTED,
        status: 400,
      });
    }

    return context.body(null, 204);
  };
}
