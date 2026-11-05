import type { Tx } from "@usenullish/nullish-db";
import { MigrationContext, type MigrationContextArgs } from "../_context";
import { isArrayAtLeastOne, isNullish } from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Migration } from "@usenullish/nullish-schema/migration";
import {
  createContacts,
  listClientsByOrgId,
  listContactsByClientId,
  updateContacts,
} from "../_helpers/clients";

type Client = Records["Billing"]["Clients"]["Select"];
type ClientContact = Records["Billing"]["Contacts"]["Select"];

type ForeignClients = Migration["Foreign"]["Clients"];
type ForeignClient = Migration["Foreign"]["Client"];
type ForeignClientContact = Migration["Foreign"]["ClientContact"];

type ContactFields = Pick<ClientContact, "lastName" | "firstName" | "email" | "phone">;

type ContactToUpdate = Pick<ClientContact, "id"> & Partial<ContactFields>;

interface ClientContactsToCreate {
  clientId: Client["id"];
  contacts: [ContactFields, ...ContactFields[]];
}

interface PreparedContacts {
  toCreate: ContactFields[];
  toUpdate: ContactToUpdate[];
}

export class MigrateContactsClientNotFoundError extends Error {}

export class MigrateContactsService extends MigrationContext {
  private constructor(args: MigrationContextArgs) {
    super(args);
  }

  static create(args: MigrationContextArgs): MigrateContactsService {
    return new this(args);
  }

  async migrate({ tx, clients }: { tx: Tx; clients: ForeignClients }): Promise<void> {
    const clientsWithContacts = clients.filter(({ contacts }) => isArrayAtLeastOne(contacts));

    if (!isArrayAtLeastOne(clientsWithContacts)) {
      return;
    }

    const existingClients = await listClientsByOrgId({ tx, organizationId: this._organizationId });

    if (existingClients.status === "error") {
      throw existingClients.err;
    }

    const existingClientsByName = new Map<string, Client>(
      existingClients.result.map((client) => [client.name.trim(), client]),
    );

    const toCreate: ClientContactsToCreate[] = [];
    const toUpdate: ContactToUpdate[] = [];

    for (const foreignClient of clientsWithContacts) {
      const prepared = await prepareClientContacts({
        tx,
        foreignClient,
        existingClientsByName,
      });

      if (isArrayAtLeastOne(prepared.toCreate)) {
        toCreate.push({ clientId: prepared.clientId, contacts: prepared.toCreate });
      }

      toUpdate.push(...prepared.toUpdate);
    }

    for (const { clientId, contacts } of toCreate) {
      const result = await createContacts({
        tx,
        organizationId: this._organizationId,
        clientId,
        contacts,
      });

      if (result.status === "error") {
        throw result.err;
      }
    }

    if (isArrayAtLeastOne(toUpdate)) {
      const result = await updateContacts({ tx, contacts: toUpdate });

      if (result.status === "error") {
        throw result.err;
      }
    }
  }
}

const prepareClientContacts = async ({
  tx,
  foreignClient,
  existingClientsByName,
}: {
  tx: Tx;
  foreignClient: ForeignClient;
  existingClientsByName: Map<string, Client>;
}): Promise<PreparedContacts & { clientId: Client["id"] }> => {
  const client = existingClientsByName.get(foreignClient.name.trim());

  if (isNullish(client)) {
    throw new MigrateContactsClientNotFoundError(
      `Cannot find the client "${foreignClient.name}". Add the clients to the migration or create it.`,
    );
  }

  const existingContacts = await listContactsByClientId({ tx, clientId: client.id });

  if (existingContacts.status === "error") {
    throw existingContacts.err;
  }

  return {
    clientId: client.id,
    ...prepareContacts({
      contacts: foreignClient.contacts,
      existingContacts: existingContacts.result,
    }),
  };
};

const prepareContacts = ({
  contacts,
  existingContacts,
}: {
  contacts: ForeignClientContact[];
  existingContacts: ClientContact[];
}): PreparedContacts => {
  const existingByName = new Map<string, ClientContact>(
    existingContacts.map((contact) => [contact.lastName.trim(), contact]),
  );

  return contacts.reduce<PreparedContacts>(
    ({ toCreate, toUpdate }, foreignContact) => {
      const fields = toContactFields(foreignContact);

      const existing = existingByName.get(foreignContact.lastName.trim());

      if (isNullish(existing)) {
        return {
          toCreate: [...toCreate, fields],
          toUpdate,
        };
      }

      const changed = (Object.keys(fields) as (keyof ContactFields)[]).some(
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

const toContactFields = ({
  lastName,
  firstName,
  email,
  phone,
}: ForeignClientContact): ContactFields => ({
  lastName,
  firstName: firstName ?? null,
  email: email ?? null,
  phone: phone ?? null,
});
