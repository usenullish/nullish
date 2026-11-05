import { selectMany, type Tx } from "@usenullish/nullish-db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";

type Client = Records["Billing"]["Clients"]["Select"];
type ClientContact = Records["Billing"]["Contacts"]["Select"];

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

type ClientContactFields = Pick<ClientContact, "lastName" | "firstName" | "email" | "phone">;

export const listClientsByOrgId = async ({
  tx,
  organizationId,
}: { tx: Tx } & Pick<Client, "organizationId">): Promise<Result<Client[]>> => {
  return tryCatch(async () => {
    return await selectMany({
      tx,
      table: DbSchema.Billing.Clients.ClientsSchema,
      schema: RecordsSchema.Billing.ClientsSchema.SelectClientsSchema,
      where: eq(DbSchema.Billing.Clients.ClientsSchema.organizationId, organizationId),
    });
  });
};

export const createClients = async ({
  tx,
  organizationId,
  clients,
}: {
  tx: Tx;
  organizationId: Client["organizationId"];
  clients: [ClientFields, ...ClientFields[]];
}): Promise<Result<Client[]>> => {
  return tryCatch(async () => {
    return await tx
      .insert(DbSchema.Billing.Clients.ClientsSchema)
      .values(clients.map((client) => ({ organizationId, ...client })))
      .returning();
  });
};

export const updateClients = async ({
  tx,
  clients,
}: {
  tx: Tx;
  clients: [
    Pick<Client, "id"> & Partial<ClientFields>,
    ...(Pick<Client, "id"> & Partial<ClientFields>)[],
  ];
}): Promise<Result<void>> => {
  return tryCatch(async () => {
    for (const { id, ...values } of clients) {
      await tx
        .update(DbSchema.Billing.Clients.ClientsSchema)
        .set(values)
        .where(eq(DbSchema.Billing.Clients.ClientsSchema.id, id));
    }
  });
};

export const listContactsByClientId = async ({
  tx,
  clientId,
}: {
  tx: Tx;
  clientId: Client["id"];
}): Promise<Result<ClientContact[]>> => {
  return tryCatch(async () => {
    return selectMany({
      tx,
      table: DbSchema.Billing.Clients.ContactsSchema,
      schema: RecordsSchema.Billing.ClientsSchema.SelectContactsSchema,
      where: eq(DbSchema.Billing.Clients.ContactsSchema.clientId, clientId),
    });
  });
};

export const createContacts = async ({
  tx,
  organizationId,
  clientId,
  contacts,
}: {
  tx: Tx;
  organizationId: Client["organizationId"];
  clientId: Client["id"];
  contacts: [ClientContactFields, ...ClientContactFields[]];
}): Promise<Result<void>> => {
  return tryCatch(async () => {
    await tx
      .insert(DbSchema.Billing.Clients.ContactsSchema)
      .values(contacts.map((contact) => ({ organizationId, clientId, ...contact })));
  });
};

export const updateContacts = async ({
  tx,
  contacts,
}: {
  tx: Tx;
  contacts: [
    Pick<ClientContact, "id"> & Partial<ClientContactFields>,
    ...(Pick<ClientContact, "id"> & Partial<ClientContactFields>)[],
  ];
}): Promise<Result<void>> => {
  return tryCatch(async () => {
    for (const { id, ...values } of contacts) {
      await tx
        .update(DbSchema.Billing.Clients.ContactsSchema)
        .set(values)
        .where(eq(DbSchema.Billing.Clients.ContactsSchema.id, id));
    }
  });
};
