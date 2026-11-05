import { type DbUserContextArgs } from "@usenullish/nullish-db";
import { nonNullish, type Result, tryCatch } from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";
import { ServiceContext } from "../../../_service/service";
import { EngineError } from "../../../errors";
import { getOrganization, updateOrganization } from "../../_helpers/organizations";

type Organization = Records["Core"]["Organizations"]["Select"];

export type DeleteOrganizationServiceArgs = DbUserContextArgs & {
  organizationId: Organization["id"];
};

class OrganizationDeletedError extends EngineError {}

export class DeleteOrganizationService extends ServiceContext {
  readonly #organizationId: Organization["id"];

  private constructor({ organizationId, ...rest }: DeleteOrganizationServiceArgs) {
    super(rest);

    this.#organizationId = organizationId;
  }

  static create(args: DeleteOrganizationServiceArgs): DeleteOrganizationService {
    return new this(args);
  }

  /**
   * Marks the organization as deleted. It stays readable but can no longer be modified, and it is
   * deleted for good after a grace period.
   */
  delete(): Promise<Result<Organization>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const organization = await getOrganization({ tx, id: this.#organizationId });

        this.#assertOrganizationNotDeleted({ organization });

        return await updateOrganization({
          tx,
          id: organization.id,
          values: { deletedAt: new Date() },
        });
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
