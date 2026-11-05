import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { useOrganization } from "~/context/contexts/organization.context";
import { BankingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

export const MovementActions = ({
  movement,
}: {
  movement: Api["BankMovements"]["Client"]["BankMovement"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  return (
    <RecordActions
      record={movement}
      items={
        <DropdownMenuItem
          render={
            <Link
              to={BankingPath.create({ organizationId: organization.id }).to({
                path: `/${movement.bankRelationId}/movements/${movement.id}`,
              })}
            />
          }
        >
          {i18n.core.action.open}
        </DropdownMenuItem>
      }
    />
  );
};
