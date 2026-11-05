import { useState } from "react";
import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { DeleteAccount } from "~/components/settings/accounts/delete/delete-account";
import { useOrganization } from "~/context/contexts/organization.context";
import { AccountingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const AccountActions = ({ account }: { account: Api["Accounts"]["Client"]["Account"] }) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <RecordActions
      record={account}
      items={
        <>
          <WriteGuard>
            <DropdownMenuItem
              render={
                <Link
                  to={AccountingPath.create({
                    organizationId: organization.id,
                  }).toSettings({
                    path: `/accounts/${account.id}`,
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
      <DeleteAccount account={account} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </RecordActions>
  );
};
