import type { Tx } from "@usenullish/nullish-db";
import { MigrationContext, type MigrationContextArgs } from "../_context";
import {
  isArrayAtLeastOne,
  isArrayEmpty,
  isNullish,
  nonNullish,
  notEmptyString,
} from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Migration } from "@usenullish/nullish-schema/migration";
import {
  createAccounts,
  listAccountsByOrgId,
  listSystemAccountsByOrgId,
  updateAccountParents,
  updateAccounts,
  updateSystemAccounts,
} from "../_helpers/accounts";

type Account = Records["Ledger"]["Accounts"]["Select"];
type SystemAccount = Records["Ledger"]["SystemAccounts"]["Select"];

type InsertAccount = Records["Ledger"]["Accounts"]["Insert"];
type UpdateAccount = Records["Ledger"]["Accounts"]["Update"];
type UpdateSystemAccount = Records["Ledger"]["SystemAccounts"]["Update"];

type ForeignAccounts = Migration["Foreign"]["Accounts"];
type ForeignAccount = Migration["Foreign"]["Account"];

type AccountToCreate = Omit<InsertAccount, "parentId" | "organizationId"> & {
  parentCode: ForeignAccount["parentCode"];
};

type AccountToUpdate = Omit<UpdateAccount, "parentId" | "code" | "type"> &
  Pick<Account, "id" | "code" | "type"> & {
    parentCode: ForeignAccount["parentCode"];
  };

type SystemAccountToBind = {
  purpose: NonNullable<ForeignAccount["purpose"]>;
  code: ForeignAccount["code"];
};

type SystemAccountToUpdate = Omit<UpdateSystemAccount, "accountId" | "purpose"> &
  Pick<SystemAccount, "id" | "purpose"> & {
    code: ForeignAccount["code"];
  };

interface PreparedAccounts {
  toCreate: AccountToCreate[];
  toUpdate: AccountToUpdate[];
}

interface PreparedSystemAccounts {
  toCreate: SystemAccountToBind[];
  toUpdate: SystemAccountToUpdate[];
}

export class MigrateAccountsDuplicateError extends Error {}
export class MigrateAccountsUnknownParentError extends Error {}
export class MigrateAccountsUnexpectedSystemAccountsError extends Error {}

export class MigrateAccountsService extends MigrationContext {
  private constructor(args: MigrationContextArgs) {
    super(args);
  }

  static create(args: MigrationContextArgs): MigrateAccountsService {
    return new this(args);
  }

  async migrate({ tx, accounts }: { tx: Tx; accounts: ForeignAccounts }): Promise<void> {
    // TODO: also use in an assertion step
    assertNoDuplicateAccounts({ accounts });
    assertParentCodeAccounts({ accounts });

    const existingAccounts = await listAccountsByOrgId({
      tx,
      organizationId: this._organizationId,
    });

    if (existingAccounts.status === "error") {
      throw existingAccounts.err;
    }

    const existingSystemAccounts = await listSystemAccountsByOrgId({
      tx,
      organizationId: this._organizationId,
    });

    if (existingSystemAccounts.status === "error") {
      throw existingSystemAccounts.err;
    }

    const { toCreate: accountsToCreate, toUpdate: accountsToUpdate } = prepareAccounts({
      accounts,
      existingAccounts: existingAccounts.result,
    });

    const { toCreate: systemAccountsToCreate, toUpdate: systemAccountsToUpdate } =
      prepareSystemAccounts({
        accounts,
        existingAccounts: existingAccounts.result,
        existingSystemAccounts: existingSystemAccounts.result,
      });

    if (systemAccountsToCreate.length > 0) {
      throw new MigrateAccountsUnexpectedSystemAccountsError(
        "Unexpected system accounts to create. Open an issue to add support for those accounts.",
      );
    }

    const created = accountsToCreate.map(({ code, type, name }) => ({
      code,
      type,
      name: name ?? null,
    }));

    if (isArrayAtLeastOne(created)) {
      const result = await createAccounts({
        tx,
        organizationId: this._organizationId,
        accounts: created,
      });

      if (result.status === "error") {
        throw result.err;
      }
    }

    const updated = accountsToUpdate.map(({ id, type, name }) => ({
      id,
      type,
      name: name ?? null,
    }));

    if (isArrayAtLeastOne(updated)) {
      const result = await updateAccounts({ tx, accounts: updated });

      if (result.status === "error") {
        throw result.err;
      }
    }

    const links = [...accountsToCreate, ...accountsToUpdate].map(({ code, parentCode }) => ({
      code,
      parentCode: parentCode ?? null,
    }));

    if (isArrayAtLeastOne(links)) {
      const result = await updateAccountParents({
        tx,
        organizationId: this._organizationId,
        links,
      });

      if (result.status === "error") {
        throw result.err;
      }
    }

    const bindings = systemAccountsToUpdate.map(({ purpose, code }) => ({ purpose, code }));

    if (isArrayAtLeastOne(bindings)) {
      const result = await updateSystemAccounts({
        tx,
        organizationId: this._organizationId,
        bindings,
      });

      if (result.status === "error") {
        throw result.err;
      }
    }
  }
}

const assertNoDuplicateAccounts = ({ accounts }: { accounts: ForeignAccounts }) => {
  const duplicates = findDuplicateCodes(accounts);

  if (!isArrayEmpty(duplicates)) {
    throw new MigrateAccountsDuplicateError(
      `The list of accounts contain duplicate: ${duplicates.join(", ")}`,
    );
  }
};

const assertParentCodeAccounts = ({ accounts }: { accounts: ForeignAccounts }) => {
  const unknownParentCodes = accounts.filter(
    ({ parentCode }) =>
      notEmptyString(parentCode) && !accounts.some(({ code }) => code === parentCode),
  );

  if (unknownParentCodes.length > 0) {
    throw new MigrateAccountsUnknownParentError(
      `The list of accounts contain unknown parent code: ${unknownParentCodes
        .map(({ parentCode }) => parentCode)
        .filter(nonNullish)
        .join(", ")}`,
    );
  }
};

const findDuplicateCodes = <T extends { code: string }>(items: T[]): string[] => {
  const counts = items.reduce<Map<string, number>>((acc, { code }) => {
    acc.set(code, (acc.get(code) ?? 0) + 1);
    return acc;
  }, new Map());

  return [...counts].filter(([, count]) => count > 1).map(([code]) => code);
};

const prepareAccounts = ({
  accounts,
  existingAccounts,
}: {
  accounts: ForeignAccounts;
  existingAccounts: Account[];
}): PreparedAccounts => {
  const existingByCode = new Map<Account["code"], Account>(
    existingAccounts.map((account) => [account.code, account]),
  );

  const codeById = new Map<Account["id"], Account["code"]>(
    existingAccounts.map((account) => [account.id, account.code]),
  );

  const currentParentCode = (account: Account): ForeignAccount["parentCode"] =>
    nonNullish(account.parentId) ? codeById.get(account.parentId) : undefined;

  return accounts.reduce<PreparedAccounts>(
    ({ toCreate, toUpdate }, { code, type, parentCode, name }) => {
      const existing = existingByCode.get(code);

      if (isNullish(existing)) {
        return {
          toCreate: [...toCreate, { code, type, parentCode, name }],
          toUpdate,
        };
      }

      const typeChanged = existing.type !== type;
      const nameChanged = (existing.name ?? null) !== (name ?? null);
      const parentChanged = currentParentCode(existing) !== parentCode;

      if (!typeChanged && !nameChanged && !parentChanged) {
        return { toCreate, toUpdate };
      }

      return {
        toCreate,
        toUpdate: [
          ...toUpdate,
          {
            id: existing.id,
            code: existing.code,
            version: existing.version,
            type,
            parentCode,
            name,
          },
        ],
      };
    },
    { toCreate: [], toUpdate: [] },
  );
};

const prepareSystemAccounts = ({
  accounts,
  existingAccounts,
  existingSystemAccounts,
}: {
  accounts: ForeignAccounts;
  existingAccounts: Account[];
  existingSystemAccounts: SystemAccount[];
}): PreparedSystemAccounts => {
  const codeById = new Map<Account["id"], Account["code"]>(
    existingAccounts.map((account) => [account.id, account.code]),
  );

  const existingByPurpose = new Map<SystemAccount["purpose"], SystemAccount>(
    existingSystemAccounts.map((systemAccount) => [systemAccount.purpose, systemAccount]),
  );

  const bindings = accounts
    .filter((account): account is ForeignAccount & { purpose: SystemAccountToBind["purpose"] } =>
      nonNullish(account.purpose),
    )
    .map(({ code, purpose }) => ({ purpose, code }));

  return bindings.reduce<PreparedSystemAccounts>(
    ({ toCreate, toUpdate }, { purpose, code }) => {
      const existing = existingByPurpose.get(purpose);

      if (isNullish(existing)) {
        return { toCreate: [...toCreate, { purpose, code }], toUpdate };
      }

      if (codeById.get(existing.accountId) === code) {
        return { toCreate, toUpdate };
      }

      return {
        toCreate,
        toUpdate: [
          ...toUpdate,
          {
            id: existing.id,
            purpose: existing.purpose,
            version: existing.version,
            code,
          },
        ],
      };
    },
    { toCreate: [], toUpdate: [] },
  );
};
