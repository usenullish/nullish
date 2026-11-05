import type { Records } from "@usenullish/nullish-schema/records";

type Organization = Records["Core"]["Organizations"]["Select"];

export interface MigrationContextArgs {
  organizationId: Organization["id"];
}

export abstract class MigrationContext {
  readonly #organizationId: Organization["id"];

  protected constructor({ organizationId }: MigrationContextArgs) {
    this.#organizationId = organizationId;
  }

  protected get _organizationId(): Organization["id"] {
    return this.#organizationId;
  }
}
