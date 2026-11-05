import { useState } from "react";
import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { DeleteBankRelation } from "~/components/settings/bank-relations/delete/delete-bank-relation";
import { useOrganization } from "~/context/contexts/organization.context";
import { BankingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const BankRelationActions = ({
  bankRelation,
}: {
  bankRelation: Api["BankRelations"]["Client"]["BankRelation"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <RecordActions
      record={bankRelation}
      items={
        <>
          <WriteGuard>
            <DropdownMenuItem
              render={
                <Link
                  to={BankingPath.create({
                    organizationId: organization.id,
                  }).toSettings({
                    path: `/bank-relations/${bankRelation.id}`,
                  })}
                />
              }
            >
              {i18n.core.action.edit}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              {i18n.core.action.delete}
            </DropdownMenuItem>
          </WriteGuard>
        </>
      }
    >
      <DeleteBankRelation
        bankRelation={bankRelation}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </RecordActions>
  );
};
