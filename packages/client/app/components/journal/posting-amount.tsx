import type { Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Amount } from "~/components/core/amount";

type Posting =
  Api["Journal"]["Client"]["GetJournalEntriesResponse"]["journalEntries"][number]["postings"][number];

export const PostingAmount = ({
  posting,
  amount,
  baseCurrency,
}: {
  posting: Posting;
  amount: bigint;
  baseCurrency: Option<string>;
}) =>
  amount === 0n ? null : (
    <>
      <Amount amount={amount} currencyCode={posting.currency} />
      {posting.currency !== baseCurrency && (
        <span className="text-muted-foreground"> × {posting.exchangeRate}</span>
      )}
    </>
  );
