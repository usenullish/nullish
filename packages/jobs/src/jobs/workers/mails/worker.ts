import { DbUserContext } from "@usenullish/nullish-db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { type Jobs, MailJobType } from "@usenullish/nullish-schema/jobs";
import type { SendMail } from "@usenullish/nullish-schema/mail";
import { getTrialingSubscription } from "./_helpers/subscription-trial-reminder";

export class MailsWorker extends DbUserContext {
  readonly #payload: Jobs["Mails"]["Payload"];
  readonly #mail: SendMail;

  private constructor({
    db,
    payload,
    mail,
  }: {
    db: PostgresDbInstance;
    payload: Jobs["Mails"]["Payload"];
    mail: SendMail;
  }) {
    super({ db, userId: payload.userId });

    this.#payload = payload;
    this.#mail = mail;
  }

  static create(args: {
    db: PostgresDbInstance;
    payload: Jobs["Mails"]["Payload"];
    mail: SendMail;
  }): MailsWorker {
    return new this(args);
  }

  run(): Promise<Result<void>> {
    return tryCatch(async () => {
      switch (this.#payload.type) {
        case MailJobType.SubscriptionTrialReminder:
          await this.#subscriptionTrialReminder({ payload: this.#payload });
          return;
      }
    });
  }

  async #subscriptionTrialReminder({
    payload: { organizationId, userId },
  }: {
    payload: Jobs["Mails"]["SubscriptionTrialReminderPayload"];
  }): Promise<void> {
    await this._withAuth(async (tx) => {
      // The worker proceed by trying the find a subscription that is still trialing. If there is one, which
      // mean the user did not subscribed the org to a plan, it sends a reminder per email (given that a trial
      // least few days). If there is no such subscription - user deleted the org or indeed subscribed to a plan -
      // then it skips and just return.
      const trialData = await getTrialingSubscription({
        tx,
        organizationId,
        userId,
      });

      // TODO: send the reminder with the data read here, nothing is sent yet
    });
  }
}
