import type { Tx } from "@usenullish/nullish-db";
import { MigrationContext, type MigrationContextArgs } from "../_context";
import {
  isArrayAtLeastOne,
  isArrayEmpty,
  isNullish,
  type Option,
} from "@usenullish/nullish-common";
import { PeriodStatus } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Migration } from "@usenullish/nullish-schema/migration";
import { listPeriodsByOrgId } from "../_helpers/periods";

type Period = Records["Ledger"]["Periods"]["Select"];
type PeriodDates = Pick<Period, "startOn" | "endOn">;

type ForeignJournal = Migration["Foreign"]["Journal"];

export class MigratePeriodsClosedError extends Error {}
export class MigratePeriodsMissingError extends Error {}

export class MigratePeriodsService extends MigrationContext {
  private constructor(args: MigrationContextArgs) {
    super(args);
  }

  static create(args: MigrationContextArgs): MigratePeriodsService {
    return new this(args);
  }

  async migrate({ tx, journal }: { tx: Tx; journal: ForeignJournal }): Promise<void> {
    const periods = await listPeriodsByOrgId({ tx, organizationId: this._organizationId });

    if (periods.status === "error") {
      throw periods.err;
    }

    assertNoClosedPeriods({ journal, periods: periods.result });
    assertNoMissingPeriods({ journal, periods: periods.result });
  }
}

const isWithin = ({ period: { startOn, endOn }, date }: { period: PeriodDates; date: Date }) =>
  startOn.getTime() <= date.getTime() && date.getTime() <= endOn.getTime();

const findPeriod = ({ periods, date }: { periods: Period[]; date: Date }): Option<Period> =>
  periods.find((period) => isWithin({ period, date }));

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

const formatPeriod = ({ startOn, endOn }: PeriodDates): string =>
  `${formatDate(startOn)} – ${formatDate(endOn)}`;

const assertNoClosedPeriods = ({
  journal,
  periods,
}: {
  journal: ForeignJournal;
  periods: Period[];
}) => {
  const closed = journal.filter(
    ({ validOn }) => findPeriod({ periods, date: validOn })?.status === PeriodStatus.CLOSED,
  );

  if (!isArrayEmpty(closed)) {
    throw new MigratePeriodsClosedError(
      `The journal contains entries in closed periods: ${closed
        .map(({ reference, validOn }) => `${reference} (${formatDate(validOn)})`)
        .join(", ")}`,
    );
  }
};

const assertNoMissingPeriods = ({
  journal,
  periods,
}: {
  journal: ForeignJournal;
  periods: Period[];
}) => {
  const years = [
    ...new Set(
      journal
        .map(({ validOn }) => validOn)
        .filter((validOn) => isNullish(findPeriod({ periods, date: validOn })))
        .map((validOn) => validOn.getUTCFullYear()),
    ),
  ].toSorted((a, b) => a - b);

  if (!isArrayAtLeastOne(years)) {
    return;
  }

  const missing = years.map((year) => ({
    startOn: new Date(Date.UTC(year, 0, 1)),
    endOn: new Date(Date.UTC(year, 11, 31)),
  }));

  throw new MigratePeriodsMissingError(
    `The journal entries need the following period(s). Open them first: ${missing
      .map(formatPeriod)
      .join(", ")}`,
  );
};
