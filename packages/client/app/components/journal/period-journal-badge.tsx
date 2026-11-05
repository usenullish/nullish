import type { Api } from "@usenullish/nullish-schema/server";
import { Badge } from "~/ui/components/badge";
import { useI18n } from "~/kit/i18n/i18n.context";

export const PeriodJournalBadge = ({
  periodJournal: { type },
}: {
  periodJournal: NonNullable<Api["JournalSummaries"]["Client"]["JournalSummary"]["periodJournal"]>;
}) => {
  const { i18n } = useI18n();

  return <Badge variant="outline">{i18n.journal.period_journal[type]}</Badge>;
};
