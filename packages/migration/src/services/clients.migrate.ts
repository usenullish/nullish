import type { Tx } from "@usenullish/nullish-db";
import { MigrationContext, type MigrationContextArgs } from "../_context";
import { isArrayAtLeastOne, isNullish } from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Migration } from "@usenullish/nullish-schema/migration";
import { createClients, listClientsByOrgId, updateClients } from "../_helpers/clients";

type Client = Records["Billing"]["Clients"]["Select"];

type ForeignClients = Migration["Foreign"]["Clients"];
type ForeignClient = Migration["Foreign"]["Client"];

type ClientFields = Pick<
  Client,
  | "type"
  | "name"
  | "careOf"
  | "address"
  | "postalCode"
  | "city"
  | "country"
  | "email"
  | "phone"
  | "website"
  | "vatNumber"
>;

type ClientToUpdate = Pick<Client, "id"> & Partial<ClientFields>;

interface PreparedClients {
  toCreate: ClientFields[];
  toUpdate: ClientToUpdate[];
}

export class MigrateClientsService extends MigrationContext {
  private constructor(args: MigrationContextArgs) {
    super(args);
  }

  static create(args: MigrationContextArgs): MigrateClientsService {
    return new this(args);
  }

  async migrate({ tx, clients }: { tx: Tx; clients: ForeignClients }): Promise<void> {
    const existingClients = await listClientsByOrgId({ tx, organizationId: this._organizationId });

    if (existingClients.status === "error") {
      throw existingClients.err;
    }

    const { toCreate, toUpdate } = prepareClients({
      clients,
      existingClients: existingClients.result,
    });

    if (isArrayAtLeastOne(toCreate)) {
      const result = await createClients({
        tx,
        organizationId: this._organizationId,
        clients: toCreate,
      });

      if (result.status === "error") {
        throw result.err;
      }
    }

    if (isArrayAtLeastOne(toUpdate)) {
      const result = await updateClients({ tx, clients: toUpdate });

      if (result.status === "error") {
        throw result.err;
      }
    }
  }
}

const prepareClients = ({
  clients,
  existingClients,
}: {
  clients: ForeignClients;
  existingClients: Client[];
}): PreparedClients => {
  const existingByName = new Map<string, Client>(
    existingClients.map((client) => [client.name.trim(), client]),
  );

  return clients.reduce<PreparedClients>(
    ({ toCreate, toUpdate }, foreignClient) => {
      const fields = toClientFields(foreignClient);

      const existing = existingByName.get(foreignClient.name.trim());

      if (isNullish(existing)) {
        return {
          toCreate: [...toCreate, fields],
          toUpdate,
        };
      }

      const changed = (Object.keys(fields) as (keyof ClientFields)[]).some(
        (key) => (existing[key] ?? null) !== (fields[key] ?? null),
      );

      if (!changed) {
        return { toCreate, toUpdate };
      }

      return {
        toCreate,
        toUpdate: [...toUpdate, { id: existing.id, ...fields }],
      };
    },
    { toCreate: [], toUpdate: [] },
  );
};

const toClientFields = (foreignClient: ForeignClient): ClientFields => ({
  type: foreignClient.type,
  name: foreignClient.name,
  careOf: foreignClient.careOf ?? null,
  address: foreignClient.address ?? null,
  postalCode: foreignClient.postalCode ?? null,
  city: foreignClient.city ?? null,
  country: foreignClient.country ?? null,
  email: foreignClient.email ?? null,
  phone: foreignClient.phone ?? null,
  website: foreignClient.website ?? null,
  vatNumber: foreignClient.vatNumber ?? null,
});
