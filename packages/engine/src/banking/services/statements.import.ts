import type { DbUserContextArgs, Tx } from "@usenullish/nullish-db";
import {
  convertStringToUlps,
  isArrayAtLeastOne,
  isNullish,
  nonNullish,
  type Option,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Services } from "@usenullish/nullish-schema/services";
import { EngineError } from "../../errors";
import { ServiceContext } from "../../_service/service";
import { getBankRelation } from "../../core/_helpers/bank-relations";
import { getCurrency, listCurrencies } from "../../core/_helpers/currencies";
import { parseCamt053 } from "../_helpers/camt";
import { insertNotConflictingNewMovements } from "../_helpers/movements";
import { insertNotConflictingNewStatement } from "../_helpers/statements";

type BankRelation = Records["Core"]["BankRelations"]["Select"];
type Currency = Records["Core"]["Currencies"]["Select"];
type CamtStatement = Services["Camt"]["Statement"];
type CamtMovement = Services["Camt"]["Movement"];

type StatementToImport = Omit<CamtStatement, "openingBalance" | "closingBalance" | "movements"> & {
  openingBalance: bigint;
  closingBalance: bigint;
  movements: (Omit<CamtMovement, "amount" | "foreignAmount" | "bankFeesAmount"> & {
    amount: bigint;
    foreignAmount: bigint | null;
    bankFeesAmount: bigint | null;
  })[];
};

type Currencies = ReadonlyMap<Currency["code"], Currency>;
type ImportStatementsArgs = Services["Banking"]["ImportStatements"]["Args"];
type ImportStatementsResult = Services["Banking"]["ImportStatements"]["Result"];

type ProcessedStatement = {
  status: "processed";
  movements: { inserted: number; existing: number };
};

type ImportedStatement = ProcessedStatement | { status: "ignored" };

export type ImportStatementsServiceArgs = DbUserContextArgs & {
  bankRelationId: BankRelation["id"];
};

class StatementBankRelationMismatchError extends EngineError {}
class StatementCurrencyMismatchError extends EngineError {}
class StatementInvalidAmountError extends EngineError {}
class StatementUnbalancedError extends EngineError {}

export class ImportStatementsService extends ServiceContext {
  readonly #bankRelationId: BankRelation["id"];

  private constructor({ bankRelationId, ...rest }: ImportStatementsServiceArgs) {
    super(rest);

    this.#bankRelationId = bankRelationId;
  }

  static create(args: ImportStatementsServiceArgs): ImportStatementsService {
    return new this(args);
  }

  import({ file }: ImportStatementsArgs): Promise<Result<ImportStatementsResult>> {
    return tryCatch(async () => {
      const parsed = parseCamt053({ file });

      if (parsed.status === "error") {
        throw parsed.err;
      }

      const { result: statementsToImport } = parsed;

      return await this._withAuth(async (tx) => {
        const bankRelation = await getBankRelation({ tx, id: this.#bankRelationId });

        for (const statement of statementsToImport) {
          this.#assertStatementOfBankRelation({ statement, bankRelation });
        }

        const currency = await getCurrency({ tx, code: bankRelation.currency });

        const otherCurrencies = await this.#loadOtherCurrencies({ tx, statementsToImport });

        const preparedStatements = statementsToImport.map((statement) =>
          this.#prepareStatements({ statement, currency, otherCurrencies }),
        );

        for (const statement of preparedStatements) {
          this.#assertStatementBalanced({ statement });
        }

        const statements: ImportedStatement[] = [];

        // One after the other to prevent overlapping statement.
        for (const statement of preparedStatements) {
          statements.push(
            await this.#importStatement({
              tx,
              statement,
              bankRelation,
            }),
          );
        }

        const processed = statements.filter(
          (statement): statement is ProcessedStatement => statement.status === "processed",
        );

        return {
          statements: {
            processed: processed.length,
            ignored: statements.length - processed.length,
          },
          movements: {
            inserted: processed.reduce((sum, { movements }) => sum + movements.inserted, 0),
            existing: processed.reduce((sum, { movements }) => sum + movements.existing, 0),
          },
        };
      });
    });
  }

  async #importStatement({
    tx,
    statement: { openingBalance, closingBalance, movements, ...statement },
    bankRelation,
  }: {
    tx: Tx;
    statement: StatementToImport;
    bankRelation: BankRelation;
  }): Promise<ImportedStatement> {
    const inserted = await insertNotConflictingNewStatement({
      tx,
      values: {
        organizationId: bankRelation.organizationId,
        bankRelationId: bankRelation.id,
        bankMessageId: statement.bankMessageId,
        bankStatementId: statement.bankStatementId,
        startOn: statement.startOn,
        endOn: statement.endOn,
        openingBalance,
        closingBalance,
        currency: statement.currency,
      },
    });

    if (isNullish(inserted)) {
      return { status: "ignored" };
    }

    const { id: statementId, organizationId } = inserted;

    const values = movements.map((movement) => ({
      ...movement,
      organizationId,
      bankRelationId: bankRelation.id,
      statementId,
    }));

    if (!isArrayAtLeastOne(values)) {
      return { status: "processed", movements: { inserted: 0, existing: 0 } };
    }

    const insertedMovements = await insertNotConflictingNewMovements({ tx, values });

    return {
      status: "processed",
      movements: {
        inserted: insertedMovements.length,
        existing: values.length - insertedMovements.length,
      },
    };
  }

  async #loadOtherCurrencies({
    tx,
    statementsToImport,
  }: {
    tx: Tx;
    statementsToImport: CamtStatement[];
  }): Promise<Currencies> {
    const codes = [
      ...new Set(
        statementsToImport
          .flatMap(({ movements }) => movements)
          .flatMap(({ foreignCurrency, bankFeesCurrency }) => [foreignCurrency, bankFeesCurrency])
          .filter(nonNullish),
      ),
    ];

    if (!isArrayAtLeastOne(codes)) {
      return new Map();
    }

    const currencies = await listCurrencies({ tx, codes });

    return new Map(currencies.map((currency) => [currency.code, currency]));
  }

  #prepareStatements({
    statement,
    currency,
    otherCurrencies,
  }: {
    statement: CamtStatement;
    currency: Currency;
    otherCurrencies: Currencies;
  }): StatementToImport {
    const toAmount = (amount: string): bigint =>
      this.#toAmount({ amount, currency, statementId: statement.bankStatementId });

    return {
      ...statement,
      openingBalance: toAmount(statement.openingBalance),
      closingBalance: toAmount(statement.closingBalance),
      movements: statement.movements.map(
        ({ foreignAmount, foreignCurrency, bankFeesAmount, bankFeesCurrency, ...movement }) => {
          const foreign = this.#toInformativeAmount({
            amount: foreignAmount,
            code: foreignCurrency,
            currencies: otherCurrencies,
          });

          const fees = this.#toInformativeAmount({
            amount: bankFeesAmount,
            code: bankFeesCurrency,
            currencies: otherCurrencies,
          });

          return {
            ...movement,
            amount: toAmount(movement.amount),
            foreignAmount: foreign?.amount ?? null,
            foreignCurrency: foreign?.code ?? null,
            bankFeesAmount: fees?.amount ?? null,
            bankFeesCurrency: fees?.code ?? null,
          };
        },
      ),
    };
  }

  // The amounts kept for information never reject a statement: an unknown currency or an amount
  // that does not fit its decimals leaves them empty.
  #toInformativeAmount({
    amount,
    code,
    currencies,
  }: {
    amount: string | null;
    code: Currency["code"] | null;
    currencies: Currencies;
  }): Option<{ amount: bigint; code: Currency["code"] }> {
    if (isNullish(amount) || isNullish(code)) {
      return undefined;
    }

    const currency = currencies.get(code);

    if (isNullish(currency)) {
      return undefined;
    }

    const ulps = convertStringToUlps({ amount, decimals: currency.decimals });

    return typeof ulps === "bigint" ? { amount: ulps, code } : undefined;
  }

  #assertStatementBalanced({
    statement: { bankStatementId, openingBalance, closingBalance, movements },
  }: {
    statement: StatementToImport;
  }) {
    const total = movements.reduce((sum, { amount }) => sum + amount, 0n);

    if (openingBalance + total !== closingBalance) {
      throw new StatementUnbalancedError(
        `Statement ${bankStatementId} does not add up: its movements do not bring the opening balance to the closing balance`,
      );
    }
  }

  #assertStatementOfBankRelation({
    statement: { bankStatementId, iban, currency, movements },
    bankRelation,
  }: {
    statement: CamtStatement;
    bankRelation: BankRelation;
  }) {
    if (iban !== bankRelation.iban) {
      throw new StatementBankRelationMismatchError(
        `Statement ${bankStatementId} is for the account ${iban}, not for this bank account (${bankRelation.iban})`,
      );
    }

    if (currency !== bankRelation.currency) {
      throw new StatementCurrencyMismatchError(
        `Statement ${bankStatementId} is in ${currency}, while this bank account is in ${bankRelation.currency}`,
      );
    }

    const foreign = movements.find((movement) => movement.currency !== currency);

    if (nonNullish(foreign)) {
      throw new StatementCurrencyMismatchError(
        `A movement of statement ${bankStatementId} is in ${foreign.currency}, while the statement is in ${currency}`,
      );
    }
  }

  #toAmount({
    amount,
    currency,
    statementId,
  }: {
    amount: string;
    currency: Currency;
    statementId: CamtStatement["bankStatementId"];
  }): bigint {
    const ulps = convertStringToUlps({ amount, decimals: currency.decimals });

    if (typeof ulps !== "bigint") {
      throw new StatementInvalidAmountError(
        `Statement ${statementId} has an amount (${amount}) that is not valid in ${currency.code}`,
      );
    }

    return ulps;
  }
}
