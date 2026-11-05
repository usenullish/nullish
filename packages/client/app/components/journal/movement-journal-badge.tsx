import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { Badge } from "~/ui/components/badge";
import { useOrganization } from "~/context/contexts/organization.context";
import { BankingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

export const MovementJournalBadge = ({
  movementJournal: { movementId, bankRelationId },
}: {
  movementJournal: NonNullable<
    Api["JournalSummaries"]["Client"]["JournalSummary"]["movementJournal"]
  >;
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  return (
    <Badge
      variant="outline"
      render={
        <Link
          to={BankingPath.create({ organizationId: organization.id }).to({
            path: `/${bankRelationId}/movements/${movementId}`,
          })}
        />
      }
    >
      {i18n.journal.label.movement}
    </Badge>
  );
};
