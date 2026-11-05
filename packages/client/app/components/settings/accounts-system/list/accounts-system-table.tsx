import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { SortableHeader } from "~/components/core/sortable-header";
import { useOrganization } from "~/context/contexts/organization.context";
import { AccountingPath } from "~/navigation";
import { useAccountsUi } from "~/kit/data/accounts.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { shortenWithMiddleEllipsis } from "@usenullish/nullish-common";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const AccountsSystemTable = ({
  accounts,
}: {
  accounts: Api["SystemAccounts"]["Client"]["SystemAccount"][];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const { accounts: accountsUi } = useAccountsUi();

  const labels = new Map(accountsUi.map(({ account, label }) => [account.id, label]));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{i18n.system_accounts.label.account}</TableHead>
          <SortableHeader field="purpose" label={i18n.core.label.purpose} />
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {accounts.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-muted-foreground">
              {i18n.system_accounts.text.empty}
            </TableCell>
          </TableRow>
        ) : (
          accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="whitespace-normal">
                {labels.get(account.accountId) ??
                  shortenWithMiddleEllipsis({ text: account.accountId })}
              </TableCell>
              <TableCell className="whitespace-normal">
                {i18n.system_accounts.purpose[account.purpose]}
              </TableCell>
              <TableCell className="w-px">
                <RecordActions
                  record={account}
                  references={[
                    {
                      label: i18n.system_accounts.label.account,
                      id: account.accountId,
                    },
                  ]}
                  items={
                    <WriteGuard>
                      <DropdownMenuItem
                        render={
                          <Link
                            to={AccountingPath.create({
                              organizationId: organization.id,
                            }).toSettings({
                              path: `/system-accounts/${account.id}`,
                            })}
                          />
                        }
                      >
                        {i18n.core.action.edit}
                      </DropdownMenuItem>
                    </WriteGuard>
                  }
                />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
