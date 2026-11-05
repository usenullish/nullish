import { type Tx } from "@usenullish/nullish-db";
import { isArrayAtLeastOne, isNullish } from "@usenullish/nullish-common";
import { type Composites } from "@usenullish/nullish-schema/composites";
import { listVatRatesWithGeneratedPostings } from "../../_helpers/journal-vat";
import { ServiceContext } from "../../../_service/service";
import { type VatRates } from "./_journal";

type SelectJournal = Composites["Journal"]["Select"];
type Posting = SelectJournal["postings"][number];

export type UsedVatRates =
  | { type: "no-vat-rates" }
  | { type: "other-vat-rates" }
  | { type: "vat-rates-with-generated-postings"; rates: VatRates };

export abstract class JournalContext extends ServiceContext {
  protected async _listUsedVatRatesWithGeneratedPostings({
    tx,
    organizationId,
    postings,
  }: {
    tx: Tx;
    organizationId: SelectJournal["entry"]["organizationId"];
    postings: Partial<Pick<Posting, "vatRateId">>[];
  }): Promise<UsedVatRates> {
    const vatRateIds = [
      ...new Set(postings.flatMap(({ vatRateId }) => (isNullish(vatRateId) ? [] : [vatRateId]))),
    ];

    if (!isArrayAtLeastOne(vatRateIds)) {
      return { type: "no-vat-rates" };
    }

    const rates = await listVatRatesWithGeneratedPostings({ tx, organizationId, vatRateIds });

    return isArrayAtLeastOne(rates)
      ? { type: "vat-rates-with-generated-postings", rates }
      : { type: "other-vat-rates" };
  }
}
