import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { MAIL_RATE_LIMITS } from "../../src/_constants";
import { MailRateLimiter, MailReservationType } from "../../src/server/_mail/_rate-limiter";

const { burst, daily } = MAIL_RATE_LIMITS;

const START = new Date("2026-11-12T08:00:00Z").getTime();

describe("MailRateLimiter", () => {
  let limiter: MailRateLimiter;

  const travel = ({ ms }: { ms: number }) => setSystemTime(new Date(START + ms));

  const reserveTimes = ({ email, times }: { email: string; times: number }) =>
    Array.from({ length: times }, () => limiter.reserve({ email }));

  beforeEach(() => {
    setSystemTime(new Date(START));
    limiter = MailRateLimiter.create();
  });

  afterEach(() => {
    setSystemTime();
  });

  test("reserves an email", () => {
    expect(limiter.reserve({ email: "test@test.dev" })).toBe(MailReservationType.RESERVED);
  });

  describe("burst", () => {
    test("reserves up to the maximum within the window", () => {
      expect(reserveTimes({ email: "test@test.dev", times: burst.maxRequests })).toEqual(
        Array(burst.maxRequests).fill(MailReservationType.RESERVED),
      );
    });

    test("reaches the limit beyond the maximum within the window", () => {
      reserveTimes({ email: "test@test.dev", times: burst.maxRequests });

      expect(limiter.reserve({ email: "test@test.dev" })).toBe(MailReservationType.LIMIT_REACHED);
    });

    test("reserves again once the window has passed", () => {
      reserveTimes({ email: "test@test.dev", times: burst.maxRequests });

      travel({ ms: burst.timeWindow });

      expect(limiter.reserve({ email: "test@test.dev" })).toBe(MailReservationType.RESERVED);
    });

    test("does not count the reservations refused because of the limit", () => {
      reserveTimes({ email: "test@test.dev", times: burst.maxRequests + 3 });

      travel({ ms: burst.timeWindow });

      expect(reserveTimes({ email: "test@test.dev", times: burst.maxRequests })).toEqual(
        Array(burst.maxRequests).fill(MailReservationType.RESERVED),
      );
    });
  });

  describe("daily", () => {
    const reserveOverBursts = ({ email, times }: { email: string; times: number }) =>
      Array.from({ length: times }, (_, index) => {
        travel({ ms: index * burst.timeWindow });
        return limiter.reserve({ email });
      });

    test("reserves up to the maximum within the day", () => {
      expect(reserveOverBursts({ email: "test@test.dev", times: daily.maxRequests })).toEqual(
        Array(daily.maxRequests).fill(MailReservationType.RESERVED),
      );
    });

    test("reaches the limit beyond the maximum within the day", () => {
      reserveOverBursts({ email: "test@test.dev", times: daily.maxRequests });

      travel({ ms: daily.maxRequests * burst.timeWindow });

      expect(limiter.reserve({ email: "test@test.dev" })).toBe(MailReservationType.LIMIT_REACHED);
    });

    test("reserves again once the day has passed", () => {
      reserveOverBursts({ email: "test@test.dev", times: daily.maxRequests });

      travel({ ms: daily.timeWindow + daily.maxRequests * burst.timeWindow });

      expect(limiter.reserve({ email: "test@test.dev" })).toBe(MailReservationType.RESERVED);
    });
  });

  describe("emails", () => {
    test("counts each email separately", () => {
      reserveTimes({ email: "test@test.dev", times: burst.maxRequests });

      expect(limiter.reserve({ email: "other@test.dev" })).toBe(MailReservationType.RESERVED);
    });

    test.each(["TEST@test.dev", " test@test.dev ", "Test@Test.Dev"])(
      "counts %p as the same email",
      (email) => {
        reserveTimes({ email: "test@test.dev", times: burst.maxRequests });

        expect(limiter.reserve({ email })).toBe(MailReservationType.LIMIT_REACHED);
      },
    );
  });
});
