import {
  assertNonNullish,
  assertNotEmptyString,
  isEmptyString,
  isNullish,
  nonNullish,
  notEmptyString,
  type Nullable,
  type Nullish,
  type Option,
  type Result,
  tryCatch,
  encodeWithCodecs,
} from "@usenullish/nullish-common";
import * as z from "zod";
import { type CellValue, readSheet } from "read-excel-file/node";
import { parse as parseCsv } from "papaparse";
import { ForeignAccounting, type ForeignAccountingSourceExtensions } from "../provider";
import {
  AccountType,
  ClientType,
  MigrationProvider,
  SystemAccountPurpose,
} from "@usenullish/nullish-schema/db";
import { countryCode } from "../_countries";
import { MigrationSchema, type Migration } from "@usenullish/nullish-schema/migration";

@ForeignAccounting
export class Bexio {
  static create(): Bexio {
    return new this();
  }

  get name(): MigrationProvider {
    return MigrationProvider.BEXIO;
  }

  get sourceExtensions(): ForeignAccountingSourceExtensions {
    return {
      accounts: ".xlsx",
      balances: ".xlsx",
      journal: ".xlsx",
      clients: ".csv",
      invoices: ".xlsx",
    };
  }

  async prepareAccounts({
    bytes,
  }: {
    bytes: Uint8Array;
  }): Promise<Result<Migration["ForeignEncoded"]["Accounts"]>> {
    return await tryCatch(async () => {
      const [header, ...rows] = await readSheet(Buffer.from(bytes));

      assertNonNullish(header, "The accounts file is empty.");

      const mapAccountType = ({
        accountType,
        code,
      }: {
        accountType: string;
        code: string;
      }): Nullish<AccountType> => {
        const mapLiabilityEquity = (): AccountType.LIABILITY | AccountType.EQUITY => {
          // Anything starting with "28" or "29" is Equity
          // (28 = Equity, 280 = Capital group, 2800 = Share capital, 2900 = Retained earnings)
          if (code.startsWith("28") || code.startsWith("29")) {
            return AccountType.EQUITY;
          }

          // Everything else in Class 2 (20, 21, 22, 23, 24, 25, 26, 27) is Liability
          // or account defined as such e.g.
          // "1162","Compte courant_Certificat de salaire","220","Passif",null,null
          return AccountType.LIABILITY;
        };

        const mapGroupLiabilityEquity = (): AccountType.LIABILITY | AccountType.EQUITY | null => {
          if (code.startsWith("2")) {
            return mapLiabilityEquity();
          }

          return null;
        };

        const mapGroup = (): Nullable<AccountType> => {
          switch (code.trim().charAt(0)) {
            case "1":
              return AccountType.ASSET;
            case "2":
              return mapGroupLiabilityEquity();
            case "3":
              return AccountType.INCOME;
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
              return AccountType.EXPENSE;
            case "9":
              return AccountType.CLOSING;
            default:
              return null;
          }
        };

        switch (accountType.trim().toLowerCase()) {
          case "aktiv":
          case "actif":
          case "attivo":
          case "asset":
            return AccountType.ASSET;
          case "passiv":
          case "passif":
          case "passivo":
          case "liability": {
            return mapLiabilityEquity();
          }
          case "ertrag":
          case "revenus":
          case "ricavi":
          case "income":
            return AccountType.INCOME;
          case "aufwand":
          case "charge":
          case "costi":
          case "expense":
            return AccountType.EXPENSE;
          case "komplett":
          case "complet":
          case "completa":
          case "complete":
            return AccountType.CLOSING;
          case "gruppe":
          case "groupe":
          case "gruppo":
          case "group":
            return mapGroup();
          default:
            return undefined;
        }
      };

      const mapSystemAccountPurpose = ({
        systemAccountPurpose,
      }: {
        systemAccountPurpose: Option<string>;
      }): Option<SystemAccountPurpose> => {
        switch (systemAccountPurpose?.trim().toUpperCase()) {
          case "BANK":
            return SystemAccountPurpose.BANK_ACCOUNT;
          case "DEBTOR":
            return SystemAccountPurpose.DEBTOR;
          case "CREDITOR":
            return SystemAccountPurpose.CREDITOR;
          case "CUSTOMER_CREDIT_BALANCE":
            return SystemAccountPurpose.CUSTOMER_CREDIT_BALANCE;

          case "DEFAULT_INCOME":
            return SystemAccountPurpose.DEFAULT_INCOME;
          case "DEFAULT_EXPENSE":
            return SystemAccountPurpose.DEFAULT_EXPENSE;
          case "INCOME_REDUCTION":
            return SystemAccountPurpose.INCOME_REDUCTION;
          case "BAD_DEBTS":
            return SystemAccountPurpose.BAD_DEBTS;
          case "EXPENSE_REDUCTION":
            return SystemAccountPurpose.EXPENSE_REDUCTION;

          case "TAX_SALES":
            return SystemAccountPurpose.VAT_TAX_DUE;
          case "SETTLEMENT_ACCOUNT_VAT":
            return SystemAccountPurpose.SETTLEMENT_ACCOUNT_VAT;
          case "TRANSITORY_TAX_ACCOUNT_SALES":
            return SystemAccountPurpose.VAT_REMUNERATION_RECEIVED;
          case "REGARDS_TAX":
            return SystemAccountPurpose.REGARDS_TAX;
          case "TAX_PRE_MATERIAL":
            return SystemAccountPurpose.TAX_PRE_MATERIAL;
          case "TAX_PRE_INVESTMENT":
            return SystemAccountPurpose.TAX_PRE_INVESTMENT;
          case "TRANSITORY_TAX_ACCOUNT_PRE":
            return SystemAccountPurpose.TRANSITORY_TAX_ACCOUNT_PRE;
          case "TAX_PRE_TAX_CUTS":
            return SystemAccountPurpose.TAX_PRE_TAX_CUTS;
          case "TAX_PRE_TAX_CORRECTION":
            return SystemAccountPurpose.TAX_PRE_TAX_CORRECTION;

          case "TAX_ROUNDING_DIFFS":
            return SystemAccountPurpose.ROUNDING_DIFFERENCES;
          case "CURRENCY_EXPENSE":
            return SystemAccountPurpose.EXCHANGE_RATE_LOSSES;
          case "CURRENCY_INCOME":
            return SystemAccountPurpose.EXCHANGE_RATE_GAINS;

          case "PROFIT_AND_LOSS":
            return SystemAccountPurpose.PROFIT_AND_LOSS;
          case "OPENING_BALANCE_SHEET":
            return SystemAccountPurpose.OPENING_BALANCE_SHEET;
          case "CLOSING_BALANCE_SHEET":
            return SystemAccountPurpose.CLOSING_BALANCE_SHEET;
          case "ANNUAL_PROFIT":
            return SystemAccountPurpose.ANNUAL_PROFIT;
          case "CORRECTION":
            return SystemAccountPurpose.CORRECTION;
          case "BALANCE_TAKEOVER":
            return SystemAccountPurpose.BALANCE_TAKEOVER;

          default:
            return undefined;
        }
      };

      const accounts = rows?.map((row) => {
        const code = this.#xlsxCell(row[0]);
        const accountType = this.#xlsxCell(row[3]);

        assertNotEmptyString(code, `Account is missing a code: ${JSON.stringify(row)}`);

        const type = notEmptyString(accountType) ? mapAccountType({ accountType, code }) : null;

        assertNonNullish(type, `Account ${code} has no known type: ${JSON.stringify(row)}`);

        return {
          name: this.#xlsxCell(row[1]),
          code,
          parentCode: this.#xlsxCell(row[2]),
          type,
          purpose: mapSystemAccountPurpose({
            systemAccountPurpose: this.#xlsxCell(row[4]),
          }),
        };
      });

      return encodeWithCodecs({
        schema: MigrationSchema.Foreign.ForeignAccountsSchema,
        value: accounts,
      });
    });
  }

  async prepareBalances({
    bytes,
  }: {
    bytes: Uint8Array;
  }): Promise<Result<Migration["ForeignEncoded"]["Balances"]>> {
    return await tryCatch(async () => {
      const [header, ...rows] = await readSheet(Buffer.from(bytes));

      assertNonNullish(header, "The balances file is empty.");

      const balances = (rows ?? []).map((row) => {
        const code = this.#xlsxCell(row[0]);
        const amount = z.coerce.number().parse(row[2]);

        assertNotEmptyString(code, `Balance is missing an account code: ${JSON.stringify(row)}`);

        return { code, amount };
      });

      return encodeWithCodecs({
        schema: MigrationSchema.Foreign.ForeignBalancesSchema,
        value: balances,
      });
    });
  }

  async prepareJournal({
    bytes,
  }: {
    bytes: Uint8Array;
  }): Promise<Result<Migration["ForeignEncoded"]["Journal"]>> {
    return await tryCatch(async () => {
      const [header, ...rows] = await readSheet(Buffer.from(bytes));

      assertNonNullish(header, "The journal file is empty.");

      // Bexio prefixes each debit/credit cell with the account code, e.g. "6940 - Frais bancaires".
      const accountCode = (value: CellValue | null | undefined): Option<string> => {
        return /^\s*(\d+)/.exec(this.#xlsxCell(value) ?? "")?.[1];
      };

      // Rows are flat double-entry lines. Parse each into a typed line tagged with its date and
      // reference, then group by "<date>::<reference>" since lines that share both belong to one
      // journal entry (sometimes a single line, sometimes many).
      const journalEntries = (rows ?? []).map((row) => {
        const date = this.#xlsxDate(row[1]);
        const reference = this.#xlsxCell(row[2]);
        const debitCode = accountCode(row[3]);
        const creditCode = accountCode(row[4]);

        assertNotEmptyString(
          reference,
          `Journal entry line is missing a reference: ${JSON.stringify(row)}`,
        );

        return {
          key: `${date.toISOString()}::${reference}`,
          reference,
          validOn: date,
          line: {
            codes: {
              debit: debitCode ?? "",
              credit: creditCode ?? "",
            },
            amount: z.coerce.number().parse(row[6]),
            currency: this.#xlsxCell(row[7]) ?? "",
            exchangeRate: z.coerce.number().parse(row[8]),
            description: this.#xlsxCell(row[5]),
            vat: this.#xlsxCell(row[11]),
          },
        };
      });

      const entries = [...Map.groupBy(journalEntries, ({ key }) => key).values()].reduce<
        Migration["Foreign"]["JournalEntry"][]
      >((acc, group) => {
        const [first] = group;

        if (isNullish(first)) {
          return acc;
        }

        const { reference, validOn } = first;

        return [
          ...acc,
          {
            reference,
            validOn,
            lines: group.map(({ line }) => line),
          },
        ];
      }, []);

      return encodeWithCodecs({
        schema: MigrationSchema.Foreign.ForeignJournalSchema,
        value: entries,
      });
    });
  }

  async prepareClients({
    bytes,
  }: {
    bytes: Uint8Array;
  }): Promise<Result<Migration["ForeignEncoded"]["Clients"]>> {
    return await tryCatch(async () => {
      const readCsv = (): string[][] =>
        parseCsv<string[]>(new TextDecoder().decode(bytes), { header: false, skipEmptyLines: true })
          .data;

      const [header, ...rows] = readCsv();

      assertNonNullish(header, "The contacts file is empty.");

      const clientContact = ({
        row,
        startIndex,
      }: {
        row: string[];
        startIndex: number;
      }): Option<Migration["Foreign"]["ClientContact"]> => {
        const csvLastName = this.#csvCell(row[startIndex + 2]);
        const csvFirstName = this.#csvCell(row[startIndex + 3]);

        if (isNullish(csvLastName) && isNullish(csvFirstName)) {
          return undefined;
        }

        const lastName = csvLastName ?? csvFirstName ?? "";
        const firstName = nonNullish(csvLastName) ? csvFirstName : undefined;

        const email = this.#csvCell(row[startIndex + 10]);

        const phone1 = this.#csvCell(row[startIndex + 12]);
        const phone2 = this.#csvCell(row[startIndex + 13]);
        const mobile = this.#csvCell(row[startIndex + 14]);

        const phone = mobile ?? phone2 ?? phone1;

        return { lastName, firstName, email, phone };
      };

      const clientType = (value: Option<string>): Migration["Foreign"]["Client"]["type"] => {
        const type = this.#csvCell(value);

        switch (type?.toLowerCase().trim()) {
          case "firma":
          case "entreprise":
          case "ditta":
          case "company":
            return ClientType.COMPANY;
          case "privat":
          case "privé":
          case "privato":
          case "private":
            return ClientType.INDIVIDUAL;
          default:
            throw new Error(`Unknown type of client: ${type}`);
        }
      };

      const displayName = ({
        name,
        firstName,
      }: {
        name: string;
        firstName?: Option<string>;
      }): string => [firstName, name].filter(notEmptyString).join(" ").trim();

      const clients = rows.reduce<Migration["Foreign"]["Client"][]>((acc, row) => {
        const type = clientType(row[4]);

        const companyOrLastName = this.#csvCell(row[5]);
        const careOfOrFirstName = this.#csvCell(row[6]);

        assertNonNullish(companyOrLastName, `A client requires a name: ${row}`);

        const name =
          type === ClientType.COMPANY
            ? companyOrLastName
            : displayName({ name: companyOrLastName, firstName: careOfOrFirstName });

        const careOf =
          type === ClientType.COMPANY && notEmptyString(careOfOrFirstName)
            ? careOfOrFirstName
            : undefined;

        const address = this.#csvCell(row[9]);
        const postalCode = this.#csvCell(row[10]);
        const city = this.#csvCell(row[11]);

        const countryName = this.#csvCell(row[12]);
        const country = nonNullish(countryName) ? countryCode({ countryName }) : undefined;

        const email = this.#csvCell(row[13]);

        const phone1 = this.#csvCell(row[15]);
        const phone2 = this.#csvCell(row[16]);
        const mobile = this.#csvCell(row[17]);

        const phone = mobile ?? phone2 ?? phone1;

        const website = this.#csvCell(row[19]);

        const vatNumber = this.#csvCell(row[20]);

        // Up to two contacts are exported by Bexio in the csv file
        const contacts = [
          clientContact({ row, startIndex: 32 }),
          clientContact({ row, startIndex: 57 }),
        ].filter(nonNullish);

        return [
          ...acc,
          {
            type,
            name,
            careOf,
            address,
            postalCode,
            city,
            country,
            email,
            phone,
            website,
            vatNumber,
            contacts,
          },
        ];
      }, []);

      const allCompaniesContactNames = new Set(
        clients.flatMap(({ contacts }) =>
          contacts.map(({ lastName, firstName }) => displayName({ name: lastName, firstName })),
        ),
      );

      const deduped = clients
        .filter(
          ({ type, name }) => type === ClientType.COMPANY || !allCompaniesContactNames.has(name),
        )
        .filter(({ name }) => name.toLowerCase() !== "bexio");

      return encodeWithCodecs({
        schema: MigrationSchema.Foreign.ForeignClientsSchema,
        value: deduped,
      });
    });
  }

  async prepareInvoices({
    bytes,
  }: {
    bytes: Uint8Array;
  }): Promise<Result<Migration["ForeignEncoded"]["Invoices"]>> {
    return await tryCatch(async () => {
      const [header, ...rows] = await readSheet(Buffer.from(bytes));

      assertNonNullish(header, "The invoices file is empty.");

      const invoiceStatus = (
        value: Nullish<CellValue>,
      ): Migration["Foreign"]["Invoice"]["status"] => {
        switch (this.#xlsxCell(value)?.toLowerCase()) {
          case "bezahlt":
          case "payé":
          case "pagato":
          case "paid":
            return "paid";
          default:
            return "other";
        }
      };

      // An invoice can be paid in several times. Bexio exports each payment as a pair of numbered
      // columns, e.g. "Date de l'encaissement 1" and "Montant de l'encaissement 1".
      const PAYMENT_DATE_HEADER =
        /^(?:Date de l['’]encaissement|Data pagamento in entrata|Datum Zahlungseingang|Date of incoming payment) (\d+)$/i;
      const PAYMENT_AMOUNT_HEADER =
        /^(?:Montant de l['’]encaissement|Importo pagamento in entrata|Betrag Zahlungseingang|Amount of incoming payment) (\d+)$/i;

      const findColumns = (headerRegex: RegExp): Map<string, number> =>
        new Map(
          header.flatMap((cell, index) => {
            const label = this.#xlsxCell(cell)?.replace(/\s+/g, " ");
            const paymentNumber = headerRegex.exec(label ?? "")?.[1];
            return notEmptyString(paymentNumber) ? [[paymentNumber, index]] : [];
          }),
        );

      const paymentDateColumns = findColumns(PAYMENT_DATE_HEADER);
      const paymentAmountColumns = findColumns(PAYMENT_AMOUNT_HEADER);

      const paymentColumns = [...paymentDateColumns].flatMap(([paymentNumber, dateIndex]) => {
        const amountIndex = paymentAmountColumns.get(paymentNumber);
        return nonNullish(amountIndex) ? [{ dateIndex, amountIndex }] : [];
      });

      const payments = (row: Nullish<CellValue>[]): Migration["Foreign"]["Invoice"]["payments"] =>
        paymentColumns.reduce<Migration["Foreign"]["Invoice"]["payments"]>(
          (acc, { dateIndex, amountIndex }) => {
            const paidOn = this.#xlsxCell(row[dateIndex]);
            const amount = this.#xlsxCell(row[amountIndex]);

            if (isEmptyString(paidOn) || isEmptyString(amount)) {
              return acc;
            }

            return [
              ...acc,
              { paidOn: this.#xlsxDate(row[dateIndex]), amount: z.coerce.number().parse(amount) },
            ];
          },
          [],
        );

      const invoices = (rows ?? []).flatMap((row) => {
        const invoiceNumber = this.#xlsxCell(row[1]);
        const currency = this.#xlsxCell(row[11]);

        if (isEmptyString(currency)) {
          return [];
        }

        assertNotEmptyString(invoiceNumber, `Invoice is missing a number: ${JSON.stringify(row)}`);

        const clientName = this.#xlsxCell(row[5]);

        assertNotEmptyString(clientName, `Invoice ${invoiceNumber} is missing a client`);

        return [
          {
            number: invoiceNumber,
            title: this.#xlsxCell(row[2]),
            status: invoiceStatus(row[3]),
            clientName,
            currency,
            netAmount: z.coerce.number().parse(row[12]),
            grossAmount: z.coerce.number().parse(row[13]),
            issueOn: this.#xlsxDate(row[14]),
            dueOn: notEmptyString(this.#xlsxCell(row[15])) ? this.#xlsxDate(row[15]) : undefined,
            payments: payments(row),
          },
        ];
      });

      return encodeWithCodecs({
        schema: MigrationSchema.Foreign.ForeignInvoicesSchema,
        value: invoices,
      });
    });
  }

  // Bexio exports dates as "DD.MM.YYYY" strings, though read-excel-file may hand back a Date.
  #xlsxDate(value: Nullish<CellValue>): Date {
    if (value instanceof Date) {
      return value;
    }

    const dateSchema = z.string().regex(/^(\d{2})\.(\d{2})\.(\d{4})$/);

    const match = dateSchema.parse(this.#xlsxCell(value));

    const [day, month, year] = match.split(".");

    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  #xlsxCell(value: Nullish<CellValue>): Option<string> {
    if (isNullish(value)) {
      return undefined;
    }

    if (value instanceof Date) {
      return new Intl.DateTimeFormat("de-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(value);
    }

    return `${value}`.trim();
  }

  #csvCell(value: Option<string>): Option<string> {
    if (isNullish(value)) {
      return undefined;
    }

    // Bexio prefixes csv cells with a leading "'" to force text formatting in
    // spreadsheet apps (e.g. "'000001", "'+41 79 111 22 33").
    const trimmed = value.replace(/^'/, "").trim();

    return notEmptyString(trimmed) ? trimmed : undefined;
  }
}
