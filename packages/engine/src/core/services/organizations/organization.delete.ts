import { type DbUserContextArgs } from "@usenullish/nullish-db";
import {
  isNullish,
  nonNullish,
  type Nullable,
  type Nullish,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import {
  PaymentCancelStatus,
  type Payments,
  type ProcessPayments,
} from "@usenullish/nullish-schema/payments";
import type { Records } from "@usenullish/nullish-schema/records";
import { ServiceContext } from "../../../_service/service";
import { EngineError } from "../../../errors";
import { getOrganization, updateOrganization } from "../../_helpers/organizations";

type Organization = Records["Core"]["Organizations"]["Select"];

export type DeleteOrganizationServiceArgs = DbUserContextArgs & {
  organizationId: Organization["id"];
  payments: Nullable<ProcessPayments>;
};

class OrganizationDeletedError extends EngineError {}

export class DeleteOrganizationService extends ServiceContext {
  readonly #userId: DeleteOrganizationServiceArgs["userId"];
  readonly #organizationId: Organization["id"];
  readonly #payments: Nullable<ProcessPayments>;

  private constructor({ organizationId, payments, ...rest }: DeleteOrganizationServiceArgs) {
    super(rest);

    this.#userId = rest.userId;
    this.#organizationId = organizationId;
    this.#payments = payments;
  }

  static create(args: DeleteOrganizationServiceArgs): DeleteOrganizationService {
    return new this(args);
  }

  /**
   * Marks the organization as deleted. With a paid subscription, the subscription is cancelled at
   * the end of its period and the organization is deleted then, otherwise right away. It stays
   * readable but can no longer be modified once deleted, and it is deleted for good after a grace
   * period.
   */
  delete(): Promise<Result<Organization>> {
    return tryCatch(async () => {
      const cancelledSubscription = await this.#cancelSubscription();

      return await this.#markDeleted({
        deletedAt:
          cancelledSubscription?.status === PaymentCancelStatus.CANCELLED
            ? cancelledSubscription.cancelAt
            : new Date(),
      });
    });
  }

  async #cancelSubscription(): Promise<Nullish<Payments["Cancel"]["Result"]>> {
    // App is running without external subscription therefore none to cancel
    if (isNullish(this.#payments)) {
      return null;
    }

    return await this.#payments.cancel({
      userId: this.#userId,
      organizationId: this.#organizationId,
    });
  }

  async #markDeleted({
    deletedAt,
  }: {
    deletedAt: NonNullable<Organization["deletedAt"]>;
  }): Promise<Organization> {
    return await this._withAuth(async (tx) => {
      const organization = await getOrganization({ tx, id: this.#organizationId });

      this.#assertOrganizationNotDeleted({ organization });

      return await updateOrganization({
        tx,
        id: organization.id,
        values: { deletedAt },
      });
    });
  }

  #assertOrganizationNotDeleted({ organization }: { organization: Organization }) {
    if (nonNullish(organization.deletedAt)) {
      throw new OrganizationDeletedError(
        `Organization ${organization.id} is already marked as deleted`,
      );
    }
  }
}
