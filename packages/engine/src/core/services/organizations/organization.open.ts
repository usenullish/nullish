import type { DbUserContextArgs } from "@usenullish/nullish-db";
import type { Result } from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";
import { ServiceContext } from "../../../_service/service";
import { DbOrganizations } from "../../records/organizations";

type Organization = Records["Core"]["Organizations"]["Select"];
type InsertOrganization = Records["Core"]["Organizations"]["Insert"];

export type OpenOrganizationServiceArgs = DbUserContextArgs;

export class OpenOrganizationService extends ServiceContext {
  readonly #organizations: DbOrganizations;

  private constructor(args: OpenOrganizationServiceArgs) {
    super(args);

    this.#organizations = DbOrganizations.create(args);
  }

  static create(args: OpenOrganizationServiceArgs): OpenOrganizationService {
    return new this(args);
  }

  async open({ values }: { values: InsertOrganization }): Promise<Result<Organization>> {
    const newOrg = await this.#organizations.insert({ values });

    // TODO: schedule trialing email reminder

    return newOrg;
  }
}
