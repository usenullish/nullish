import { type DbUserContextArgs, type Tx } from "@usenullish/nullish-db";
import { LegalForm, PeriodCloseMode, PeriodStatus } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { isArrayAtLeastOne, isNullish, type Result, tryCatch } from "@usenullish/nullish-common";
import { EngineError } from "../../../errors";
import { getOrganization } from "../../../core/_helpers/organizations";
import { listOpenVatPeriods } from "../../../core/_helpers/vat";
import {
  findNextPeriod,
  getPeriod,
  listOpenPeriodsBefore,
  updatePeriod,
} from "../../_helpers/periods";
import { ServiceContext } from "../../../_service/service";
import type { PeriodClosing, PeriodClosingArgs } from "./_closing";
import { CompanyClosing } from "./_closing.company";
import { SoleProprietorshipClosing } from "./_closing.sole-proprietorship";

type Period = Records["Ledger"]["Periods"]["Select"];

export type ClosePeriodServiceArgs = DbUserContextArgs & { periodId: Period["id"] };

class PeriodInvalidStatusError extends EngineError {}
class PeriodPreviousOpenError extends EngineError {}
class PeriodOpenVatPeriodsError extends EngineError {}
class PeriodUndefinedNextPeriodError extends EngineError {}

export class ClosePeriodService extends ServiceContext {
  readonly #periodId: Period["id"];

  private constructor({ periodId, ...rest }: ClosePeriodServiceArgs) {
    super(rest);

    this.#periodId = periodId;
  }

  static create(args: ClosePeriodServiceArgs): ClosePeriodService {
    return new this(args);
  }

  close({ mode }: { mode: PeriodCloseMode }): Promise<Result<Period>> {
    switch (mode) {
      case PeriodCloseMode.CLOSING_ENTRIES:
        return this._withViewRefresh(async () => {
          return await this.#close();
        });
      case PeriodCloseMode.STATUS_ONLY:
        return this.#markClosed();
    }
  }

  #markClosed(): Promise<Result<Period>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const period = await getPeriod({
          tx,
          id: this.#periodId,
          lock: "no key update",
        });

        await this.#assertClosable({ tx, period });

        return await updatePeriod({
          tx,
          id: period.id,
          values: { status: PeriodStatus.CLOSED },
        });
      });
    });
  }

  #close(): Promise<Result<Period>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const period = await getPeriod({
          tx,
          id: this.#periodId,
          lock: "no key update",
        });

        await this.#assertClosable({ tx, period });

        const nextPeriod = await this.#loadNextPeriod({ tx, period });

        const { organizationId } = period;

        const { legalForm } = await getOrganization({
          tx,
          id: organizationId,
        });

        const service = this.#initClosing({
          organizationId,
          period,
          nextPeriod,
          legalForm,
        });

        await service.book({ tx });

        return await updatePeriod({
          tx,
          id: period.id,
          values: { status: PeriodStatus.CLOSED },
        });
      });
    });
  }

  #initClosing({
    legalForm,
    ...args
  }: PeriodClosingArgs & { legalForm: LegalForm }): PeriodClosing {
    switch (legalForm) {
      case LegalForm.LLC:
      case LegalForm.CORPORATION:
        return CompanyClosing.create(args);
      case LegalForm.SOLE_PROPRIETORSHIP:
        return SoleProprietorshipClosing.create(args);
    }
  }

  async #assertClosable({ tx, period }: { tx: Tx; period: Period }): Promise<void> {
    this.#assertPeriodOpen({ period });

    await this.#assertPreviousPeriodsClosed({ tx, period });
    await this.#assertVatPeriodsClosed({ tx, period });
  }

  #assertPeriodOpen({ period }: { period: Period }) {
    if (period.status !== PeriodStatus.OPEN) {
      throw new PeriodInvalidStatusError(
        `Unexpected status: Period ${period.id} is ${period.status} and not ${PeriodStatus.OPEN}`,
      );
    }
  }

  async #assertPreviousPeriodsClosed({ tx, period }: { tx: Tx; period: Period }): Promise<void> {
    const openPeriods = await listOpenPeriodsBefore({ tx, ...period });

    if (isArrayAtLeastOne(openPeriods)) {
      throw new PeriodPreviousOpenError(
        `Period ${period.id} cannot be closed before the previous periods are closed`,
      );
    }
  }

  async #assertVatPeriodsClosed({ tx, period }: { tx: Tx; period: Period }): Promise<void> {
    const openVatPeriods = await listOpenVatPeriods({ tx, ...period });

    if (isArrayAtLeastOne(openVatPeriods)) {
      throw new PeriodOpenVatPeriodsError(
        `Period ${period.id} cannot be closed before its VAT periods are closed`,
      );
    }
  }

  async #loadNextPeriod({ tx, period }: { tx: Tx; period: Period }): Promise<Period> {
    const nextPeriod = await findNextPeriod({ tx, ...period });

    if (isNullish(nextPeriod)) {
      throw new PeriodUndefinedNextPeriodError(
        `Period ${period.id} cannot be closed before the next period is created`,
      );
    }

    if (nextPeriod.status !== PeriodStatus.OPEN) {
      throw new PeriodInvalidStatusError(
        `Unexpected status: Period ${nextPeriod.id} is ${nextPeriod.status} and not ${PeriodStatus.OPEN}`,
      );
    }

    return nextPeriod;
  }
}
