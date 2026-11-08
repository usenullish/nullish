import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Upload } from "lucide-react";
import { formatIban, isNullish, nonNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { ImportStatements } from "~/components/banking/import/import-statements";
import { DeleteBankRelation } from "~/components/banking/delete/delete-bank-relation";
import { WriteGuard } from "~/components/auth/guards/write-guard";
import { useOrganization } from "~/context/contexts/organization.context";
import { useAccounts } from "~/context/contexts/accounts.context";
import { BankingPath } from "~/navigation";
import { useAccountName } from "~/kit/data/accounts.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

export const BankRelationDetails = ({
  bankRelation,
}: {
  bankRelation: Api["BankRelations"]["Client"]["BankRelation"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const accounts = useAccounts();
  const accountName = useAccountName();
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const account = accounts?.find(({ id }) => id === bankRelation.accountId);

  const rows = [
    { label: i18n.bank_relations.label.iban, value: formatIban(bankRelation.iban) },
    {
      label: i18n.bank_relations.label.qr_iban,
      value: isNullish(bankRelation.invoiceIban) ? null : formatIban(bankRelation.invoiceIban),
    },
    { label: i18n.core.label.currency, value: bankRelation.currency },
    {
      label: i18n.bank_relations.label.account,
      value: isNullish(account) ? null : `${account.code} ${accountName(account)}`,
    },
  ];

  const bankingPath = BankingPath.create({ organizationId: organization.id });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xs font-medium">{bankRelation.name}</h1>

        <WriteGuard>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setUploadOpen(true)}>
              <Upload />
              {i18n.bank_relations.action.upload_file}
            </Button>

            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to={bankingPath.to({ path: `/${bankRelation.id}/reconcile` })} />}
            >
              {i18n.bank_movements.action.reconcile}
            </Button>

            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to={bankingPath.to({ path: `/${bankRelation.id}/edit` })} />}
            >
              {i18n.core.action.edit}
            </Button>

            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              {i18n.core.action.delete}
            </Button>
          </div>
        </WriteGuard>

        <ImportStatements
          bankRelation={bankRelation}
          open={uploadOpen}
          onOpenChange={setUploadOpen}
        />

        <DeleteBankRelation
          bankRelation={bankRelation}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={async () => {
            await navigate(bankingPath.to());
          }}
        />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        {rows
          .filter(({ value }) => nonNullish(value))
          .map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
};
