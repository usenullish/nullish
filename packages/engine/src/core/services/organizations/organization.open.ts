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
import { getSelfSubscriptionTrialEnd } from "../../_helpers/subscriptions";

type Organization = Records["Core"]["Organizations"]["Select"];
type InsertOrganization = Records["Core"]["Organizations"]["Insert"];
type TrialReminderPayload = Jobs["Mails"]["SubscriptionTrialReminderPayload"];

export type OpenOrganizationServiceArgs = DbUserContextArgs & {
  jobs: TriggerJobs;
  payments: Nullable<ProcessPayments>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_REMINDER_MAX_NOTICE_MS = 3 * DAY_MS;

const trialReminderDelay = ({ trialEnd }: { trialEnd: Date }): number => {
  const trialMs = trialEnd.getTime() - Date.now();
  return trialMs - Math.min(TRIAL_REMINDER_MAX_NOTICE_MS, trialMs / 2);
};

export class OpenOrganizationService extends ServiceContext {
  readonly #userId: OpenOrganizationServiceArgs["userId"];
  readonly #jobs: TriggerJobs;
  readonly #payments: Nullable<ProcessPayments>;
  readonly #organizations: DbOrganizations;

  private constructor({ jobs, payments, ...rest }: OpenOrganizationServiceArgs) {
    super(rest);

    this.#userId = rest.userId;
    this.#jobs = jobs;
    this.#payments = payments;
    this.#organizations = DbOrganizations.create(rest);
  }

  static create(args: OpenOrganizationServiceArgs): OpenOrganizationService {
    return new this(args);
  }

  async open({
    values,
    lang,
  }: {
    values: InsertOrganization;
    lang: DefaultTemplateLanguage;
  }): Promise<Result<Organization>> {
    const result = await this.#organizations.insert({ values });

    if (result.status === "error") {
      return result;
    }

    // No payments enabled, we can return the organization without further work.
    if (isNullish(this.#payments)) {
      return result;
    }

    const scheduled = await this.#scheduleTrialReminder({
      organizationId: result.result.id,
      lang,
    });

    if (scheduled.status === "error") {
      console.error("Unexpected error while scheduling the trial reminder", scheduled.err);
    }

    return result;
  }

  #scheduleTrialReminder({
    organizationId,
    lang,
  }: Pick<TrialReminderPayload, "organizationId" | "lang">): Promise<Result<void>> {
    return tryCatch(async () => {
      const trialEnd = await this._withAuth(
        async (tx) => await getSelfSubscriptionTrialEnd({ tx, organizationId }),
      );

      if (isNullish(trialEnd)) {
        return;
      }

      await this.#jobs.trigger<TrialReminderPayload>({
        key: TriggeredJobKey.Mail,
        payload: {
          type: MailJobType.SubscriptionTrialReminder,
          userId: this.#userId,
          organizationId,
          lang,
        },
        delay: trialReminderDelay({ trialEnd }),
      });
    });
  }
}
