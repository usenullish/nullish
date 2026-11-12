import type { Mail } from "@usenullish/nullish-schema/mail";
import { MAIL_RATE_LIMITS } from "../../_constants";

type Email = Mail["Send"]["Args"]["to"];
type ReservedAt = ReturnType<typeof Date.now>;

export enum MailReservationType {
  RESERVED = "reserved",
  LIMIT_REACHED = "limit_reached",
}

// better-auth only rate limits per IP and over short windows. This limits the emails per address,
// also over a day, so that requests from many IPs or spread over time cannot flood an inbox.
export class MailRateLimiter {
  #reservations = new Map<Email, ReservedAt[]>();

  private constructor() {}

  static create(): MailRateLimiter {
    return new this();
  }

  reserve({ email }: { email: Email }): MailReservationType {
    const key = email.trim().toLowerCase();
    const now = Date.now();

    this.#deleteExpired({ now });

    const reservations = this.#reservations.get(key) ?? [];

    const limitReached = Object.values(MAIL_RATE_LIMITS).some(
      ({ timeWindow, maxRequests }) =>
        reservations.filter((reservedAt) => now - reservedAt < timeWindow).length >= maxRequests,
    );

    if (limitReached) {
      return MailReservationType.LIMIT_REACHED;
    }

    this.#reservations.set(key, [...reservations, now]);

    return MailReservationType.RESERVED;
  }

  #deleteExpired({ now }: { now: ReservedAt }): void {
    this.#reservations = new Map(
      [...this.#reservations]
        .map(
          ([email, reservations]) =>
            [
              email,
              reservations.filter(
                (reservedAt) => now - reservedAt < MAIL_RATE_LIMITS.daily.timeWindow,
              ),
            ] as const,
        )
        .filter(([_, unexpired]) => unexpired.length > 0),
    );
  }
}
