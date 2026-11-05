import type { Tx } from "@usenullish/nullish-db";
import { MigrationContext, type MigrationContextArgs } from "../_context";
import { isArrayAtLeastOne, isNullish, notEmptyString } from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Migration } from "@usenullish/nullish-schema/migration";
import { listPeriodsByOrgId } from "../_helpers/periods";
import { getVatSettingByOrgId, listVatMethodsByOrgId } from "../_helpers/vat";

type Period = Records["Ledger"]["Periods"]["Select"];

type ForeignJournal = Migration["Foreign"]["Journal"];

export class MigrateVatMethodsNoVatSettingsError extends Error {}
export class MigrateVatMethodsMissingError extends Error {}

// The journal entries booked with a VAT rate need the VAT methods of their fiscal year. The periods
// opened for the journal, e.g. the years before the organization was created in the app, have none,
// since a new period only copies the methods of the period before it.
export class MigrateVatMethodsService extends MigrationContext {
  private constructor(args: MigrationContextArgs) {
    super(args);
  }

  static create(args: MigrationContextArgs): MigrateVatMethodsService {
    return new this(args);
  }

  async migrate({ tx, journal }: { tx: Tx; journal: ForeignJournal }): Promise<void> {
    const withVat = journal.filter(({ lines }) => lines.some(({ vat }) => notEmptyString(vat)));

    if (!isArrayAtLeastOne(withVat)) {
      return;
    }

    const setting = await getVatSettingByOrgId({ tx, organizationId: this._organizationId });

    if (setting.status === "error") {
      throw setting.err;
    }

    if (isNullish(setting.result)) {
      throw new MigrateVatMethodsNoVatSettingsError(
        "The journal entries have VAT but the organization has no VAT settings. Set its VAT number first.",
      );
    }

    const periods = await listPeriodsByOrgId({ tx, organizationId: this._organizationId });

    if (periods.status === "error") {
      throw periods.err;
    }

    const methods = await listVatMethodsByOrgId({ tx, organizationId: this._organizationId });

    if (methods.status === "error") {
      throw methods.err;
    }

    const periodsWithMethods = new Set(methods.result.map(({ periodId }) => periodId));

    const periodsWithoutMethods = periods.result
      .filter(({ id }) => !periodsWithMethods.has(id))
      .filter((period) => withVat.some(({ validOn }) => isWithin({ period, date: validOn })))
      .toSorted((a, b) => a.startOn.getTime() - b.startOn.getTime());

    if (isArrayAtLeastOne(periodsWithoutMethods)) {
      throw new MigrateVatMethodsMissingError(
        `The following period(s) have no VAT methods. Set them first: ${periodsWithoutMethods
          .map(({ startOn }) => startOn.getUTCFullYear())
          .join(", ")}`,
      );
    }
  }
}

const isWithin = ({ period: { startOn, endOn }, date }: { period: Period; date: Date }) =>
  startOn.getTime() <= date.getTime() && date.getTime() <= endOn.getTime();
