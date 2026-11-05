import { cn } from "cn";
import { isNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Amount } from "~/components/core/amount";
import { Table, TableBody, TableCell, TableRow } from "~/ui/components/table";
import { useAccounts } from "~/context/contexts/accounts.context";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useAccountName } from "~/kit/data/accounts.hooks";

const DEPTH_PADDINGS = ["pl-2", "pl-6", "pl-10", "pl-14", "pl-18", "pl-22"];

const depthPadding = (depth: number): string =>
  DEPTH_PADDINGS[Math.min(depth, DEPTH_PADDINGS.length - 1)] ?? "pl-2";

export type AccountBalance =
  Api["BalanceSheet"]["Client"]["GetBalanceSheetResponse"]["balanceSheet"][number];

export const useReportHierarchy = ({ rows }: { rows: AccountBalance[] }) => {
  const accounts = useAccounts();

  const parents = new Map<string, AccountBalance["parentId"]>([
    ...(accounts ?? []).map(({ id, parentId }) => [id, parentId] as const),
    ...rows.flatMap(({ accountId, parentId }) =>
      isNullish(accountId) ? [] : [[accountId, parentId] as const],
    ),
  ]);

  const parentIds = new Set(rows.map(({ parentId }) => parentId));

  const depthOf = (accountId: string): number => {
    const parentId = parents.get(accountId);

    return isNullish(parentId) ? 0 : 1 + depthOf(parentId);
  };

  const isGroup = (accountId: string): boolean => parentIds.has(accountId);

  const total = ({ rows }: { rows: AccountBalance[] }): bigint =>
    rows
      .filter(({ accountId }) => !isNullish(accountId) && !isGroup(accountId))
      .reduce((sum, { balance }) => sum + balance, 0n);

  return { depthOf, isGroup, total };
};

export type ReportHierarchy = ReturnType<typeof useReportHierarchy>;

export const AccountBalancesSection = ({
  rows,
  hierarchy: { depthOf, isGroup },
  total,
  extra = [],
}: {
  rows: AccountBalance[];
  hierarchy: ReportHierarchy;
  total: { label: string; amount: bigint };
  extra?: { label: string; amount: bigint }[];
}) => {
  const accountingSettings = useAccountingSettings();
  const accountName = useAccountName();

  const currency = accountingSettings?.baseCurrency;

  const accountRows = rows.flatMap(({ accountId, code, name, balance }) =>
    isNullish(accountId) || isNullish(code) ? [] : [{ accountId, code, name, balance }],
  );

  const depths = accountRows.map(({ accountId }) => depthOf(accountId));
  const minDepth = Math.min(...depths);

  return (
    <section className="flex flex-col gap-2">
      <Table>
        <TableBody>
          {accountRows.map((row, i) => {
            return (
              <TableRow
                key={row.accountId}
                className={isGroup(row.accountId) ? "font-medium" : undefined}
              >
                <TableCell
                  className={cn(
                    "whitespace-normal",
                    depthPadding((depths[i] ?? minDepth) - minDepth),
                  )}
                >
                  {isGroup(row.accountId) ? accountName(row) : `${row.code} · ${accountName(row)}`}
                </TableCell>
                <TableCell className="w-px text-right tabular-nums">
                  <Amount amount={row.balance} currencyCode={currency} />
                </TableCell>
              </TableRow>
            );
          })}

          {extra.map(({ label, amount }) => (
            <TableRow key={label}>
              <TableCell>{label}</TableCell>
              <TableCell className="w-px text-right tabular-nums">
                <Amount amount={amount} currencyCode={currency} />
              </TableCell>
            </TableRow>
          ))}

          <TableRow className="font-medium">
            <TableCell>{total.label}</TableCell>
            <TableCell className="w-px text-right tabular-nums">
              <Amount amount={total.amount} currencyCode={currency} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </section>
  );
};
