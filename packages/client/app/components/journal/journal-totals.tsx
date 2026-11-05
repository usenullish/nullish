import type { Api } from "@usenullish/nullish-schema/server";
import { cn } from "cn";
import { Amount } from "~/components/core/amount";
import { useI18n } from "~/kit/i18n/i18n.context";

export const JournalTotals = ({
  totalDebit,
  totalCredit,
  baseCurrency,
}: {
  totalDebit: bigint;
  totalCredit: bigint;
  baseCurrency: Api["Currencies"]["Client"]["Currency"]["code"];
}) => {
  const { i18n } = useI18n();

  const difference = totalDebit - totalCredit;

  return (
    <dl className="ml-auto grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs tabular-nums">
      <dt className="text-muted-foreground">{i18n.journal.label.total_debit}</dt>
      <dd className="text-right">
        <Amount amount={totalDebit} currencyCode={baseCurrency} />
      </dd>
      <dt className="text-muted-foreground">{i18n.journal.label.total_credit}</dt>
      <dd className="text-right">
        <Amount amount={totalCredit} currencyCode={baseCurrency} />
      </dd>
      <dt className="text-muted-foreground">{i18n.journal.label.difference}</dt>
      <dd className={cn("text-right", difference !== 0n && "text-destructive")}>
        <Amount amount={difference} currencyCode={baseCurrency} />
      </dd>
    </dl>
  );
};
