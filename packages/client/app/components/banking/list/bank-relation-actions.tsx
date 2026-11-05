import { useState } from "react";
import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { ImportStatements } from "~/components/banking/import/import-statements";
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
  const [importOpen, setImportOpen] = useState(false);

  return (
    <RecordActions
      record={bankRelation}
      items={
        <>
          <DropdownMenuItem
            render={
              <Link
                to={BankingPath.create({ organizationId: organization.id }).to({
                  path: `/${bankRelation.id}?status=unreconciled`,
                })}
              />
            }
          >
            {i18n.core.action.open}
          </DropdownMenuItem>
          <WriteGuard>
            <DropdownMenuItem onClick={() => setImportOpen(true)}>
              {i18n.bank_relations.action.upload_file}
            </DropdownMenuItem>
          </WriteGuard>
        </>
      }
    >
      <ImportStatements
        bankRelation={bankRelation}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </RecordActions>
  );
};
