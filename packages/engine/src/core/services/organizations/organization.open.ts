import type { DbUserContextArgs } from "@usenullish/nullish-db";
import { isNullish, type Nullable, type Result, tryCatch } from "@usenullish/nullish-common";
import {
  type Jobs,
  MailJobType,
  type TriggerJobs,
  TriggeredJobKey,
} from "@usenullish/nullish-schema/jobs";
import type { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import type { ProcessPayments } from "@usenullish/nullish-schema/payments";
import type { Records } from "@usenullish/nullish-schema/records";
import { ServiceContext } from "../../../_service/service";
import { DbOrganizations } from "../../records/organizations";
import { getSelfSubscriptionTrialEnd, trialReminderDelay } from "../../_helpers/subscriptions";

type Organization = Records["Core"]["Organizations"]["Select"];
type InsertOrganization = Records["Core"]["Organizations"]["Insert"];
type TrialReminderPayload = Jobs["Mails"]["SubscriptionTrialReminderPayload"];

interface TrialReminder {
  jobs: TriggerJobs;
  payments: ProcessPayments;
  lang: DefaultTemplateLanguage;
}

export type OpenOrganizationServiceArgs = DbUserContextArgs & {
  trialReminder: Nullable<TrialReminder>;
};

export class OpenOrganizationService extends ServiceContext {
  readonly #db: DbUserContextArgs["db"];
  readonly #userId: DbUserContextArgs["userId"];

  readonly #trialReminder: Nullable<TrialReminder>;

  private constructor({ trialReminder, ...rest }: OpenOrganizationServiceArgs) {
    super(rest);

    this.#db = rest.db;
    this.#userId = rest.userId;

    this.#trialReminder = trialReminder;
  }

  static create(args: OpenOrganizationServiceArgs): OpenOrganizationService {
    return new this(args);
  }

  async open({
    organization,
  }: {
    organization: InsertOrganization;
  }): Promise<Result<Organization>> {
    // We do not use _withAuth here because creating an organization is a bit particular.
    // See comment in DbOrganizations.insert.
    const result = await DbOrganizations.create({
      db: this.#db,
      userId: this.#userId,
    }).insert({
      values: organization,
    });

    if (result.status === "error") {
      return result;
    }

    // No payments enabled, we can return the organization without further work.
    if (isNullish(this.#trialReminder)) {
      return result;
    }

    const scheduled = await this.#scheduleTrialReminder({
      ...this.#trialReminder,
      organizationId: result.result.id,
    });

    if (scheduled.status === "error") {
      console.error("Unexpected error while scheduling the trial reminder", scheduled.err);
    }

    return result;
  }

  #scheduleTrialReminder({
    organizationId,
    jobs,
    lang,
  }: Pick<TrialReminderPayload, "organizationId"> & Pick<TrialReminder, "jobs" | "lang">): Promise<
    Result<void>
  > {
    return tryCatch(async () => {
      const trialEnd = await this._withAuth(
        async (tx) => await getSelfSubscriptionTrialEnd({ tx, organizationId }),
      );

      if (isNullish(trialEnd)) {
        return;
      }

      await jobs.trigger<TrialReminderPayload>({
        key: TriggeredJobKey.Mail,
        payload: {
          type: MailJobType.SubscriptionTrialReminder,
          userId: this.#userId,
          organizationId,
          lang,
        },
        delay: trialReminderDelay({ trialEnd, now: new Date() }),
      });
    });
  }
}
