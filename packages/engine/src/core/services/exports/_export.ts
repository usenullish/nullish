import type { DbUserContextArgs, Tx } from "@usenullish/nullish-db";
import type { Records } from "@usenullish/nullish-schema/records";
import { ServiceContext } from "../../../_service/service";
import { getOrganization } from "../../_helpers/organizations";

type Organization = Records["Core"]["Organizations"]["Select"];
type OrganizationId = Organization["id"];

export type ExportServiceArgs = DbUserContextArgs & { organizationId: OrganizationId };

export abstract class ExportService extends ServiceContext {
  readonly #organizationId: OrganizationId;

  protected constructor({ organizationId, ...rest }: ExportServiceArgs) {
    super(rest);

    this.#organizationId = organizationId;
  }

  protected async _loadOrganization({ tx }: { tx: Tx }): Promise<Organization> {
    return await getOrganization({ tx, id: this.#organizationId });
  }
}
