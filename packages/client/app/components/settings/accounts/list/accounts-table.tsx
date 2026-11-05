import { Link } from "react-router";
import { Plus } from "lucide-react";
import type { Api } from "@usenullish/nullish-schema/server";
import { AccountType } from "@usenullish/nullish-schema/db";
import { Badge } from "~/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { Pagination } from "~/components/core/pagination";
import { SortableHeader } from "~/components/core/sortable-header";
import { FilterSelect, FilterText, ListFilters } from "~/components/core/list-filters";
import { Button } from "~/ui/components/button";
import { useOrganization } from "~/context/contexts/organization.context";
import { AccountingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { AccountActions } from "~/components/settings/accounts/list/account-actions";
import { useAccountName } from "~/kit/data/accounts.hooks";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const AccountsTable = ({
  accounts,
}: {
  accounts: Api["Accounts"]["Client"]["Account"][];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const accountName = useAccountName();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListFilters>
          <FilterSelect
            name="type"
            label={i18n.core.label.type}
            options={Object.values(AccountType).map((value) => ({
              value,
              label: i18n.accounts.type[value],
            }))}
          />
          <FilterText name="search" label={i18n.core.label.search} />
        </ListFilters>

        <WriteGuard>
          <Button
            nativeButton={false}
            render={
              <Link
                to={AccountingPath.create({
                  organizationId: organization.id,
                }).toSettings({ path: "/accounts/new" })}
              />
            }
          >
            <Plus />
            {i18n.accounts.action.create}
          </Button>
        </WriteGuard>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="code" label={i18n.core.label.code} />
            <SortableHeader field="name" label={i18n.core.label.name} />
            <TableHead>{i18n.core.label.type}</TableHead>
            <TableHead className="w-px" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                {i18n.accounts.text.no_results}
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="w-px tabular-nums">{account.code}</TableCell>
                <TableCell className="whitespace-normal">{accountName(account)}</TableCell>
                <TableCell className="w-px">
                  <Badge variant="outline">{i18n.accounts.type[account.type]}</Badge>
                </TableCell>
                <TableCell className="w-px">
                  <AccountActions account={account} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Pagination count={accounts.length} />
    </div>
  );
};
