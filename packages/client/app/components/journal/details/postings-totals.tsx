import { isNullish, nonNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { EXCHANGE_RATE_DECIMALS } from "@usenullish/nullish-schema/db";
import { JournalTotals } from "~/components/journal/journal-totals";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useBaseAmount } from "~/kit/data/base-amount.hooks";

type Posting =
  Api["Journal"]["Client"]["GetJournalEntriesResponse"]["journalEntries"][number]["postings"][number];

export const PostingsTotals = ({ postings }: { postings: Posting[] }) => {
  const accountingSettings = useAccountingSettings();
  const baseAmount = useBaseAmount();

  const baseCurrency = accountingSettings?.baseCurrency;

  const inBaseCurrency = ({ debit, credit, currency, exchangeRate }: Posting) => {
    const rate = exchangeRate.toFixed(EXCHANGE_RATE_DECIMALS);

    const baseDebit = baseAmount({ amount: debit, currency, exchangeRate: rate });
    const baseCredit = baseAmount({ amount: credit, currency, exchangeRate: rate });

    if (isNullish(baseDebit) || isNullish(baseCredit)) {
      return undefined;
    }

    return { debit: baseDebit, credit: baseCredit };
  };

  const amounts = postings.map(inBaseCurrency).filter(nonNullish);

  if (isNullish(baseCurrency) || amounts.length !== postings.length) {
    return null;
  }

  return (
    <JournalTotals
      totalDebit={amounts.reduce((total, { debit }) => total + debit, 0n)}
      totalCredit={amounts.reduce((total, { credit }) => total + credit, 0n)}
      baseCurrency={baseCurrency}
    />
  );
};
