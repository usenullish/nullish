import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { isEmptyString, nonNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { useOrganization } from "~/context/contexts/organization.context";
import { BillingPath } from "~/navigation";
import { DeleteClient } from "~/components/billing/clients/delete/delete-client";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useFormatLanguage } from "~/kit/format/language.hooks";
import { useFormatCountry } from "~/kit/format/country.hooks";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const ClientDetails = ({
  client,
}: {
  client: NonNullable<Api["Clients"]["Client"]["GetClientResponse"]["client"]>;
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const formatCountry = useFormatCountry();
  const formatLanguage = useFormatLanguage();

  const address = [
    client.careOf,
    client.address,
    [client.postalCode, client.city].filter(nonNullish).join(" "),
    nonNullish(client.country) ? formatCountry(client.country) : null,
  ].filter((line): line is string => nonNullish(line) && !isEmptyString(line));

  const rows = [
    { label: i18n.core.label.type, value: i18n.clients.type[client.type] },
    { label: i18n.vat.label.number, value: client.vatNumber },
    {
      label: i18n.organizations.label.address,
      value: address.length > 0 ? address : null,
    },
    {
      label: i18n.core.label.language,
      value: nonNullish(client.language) ? formatLanguage(client.language) : null,
    },
    { label: i18n.core.label.email, value: client.email },
    { label: i18n.core.label.phone, value: client.phone },
    { label: i18n.organizations.label.website, value: client.website },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xs font-medium">{client.name}</h1>

        <WriteGuard>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  to={BillingPath.create({ organizationId: organization.id }).to({
                    path: `/clients/${client.id}/edit`,
                  })}
                />
              }
            >
              {i18n.core.action.edit}
            </Button>

            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              {i18n.core.action.delete}
            </Button>
          </div>
        </WriteGuard>

        <DeleteClient
          client={client}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={async () => {
            await navigate(
              BillingPath.create({ organizationId: organization.id }).to({
                path: "/clients",
              }),
            );
          }}
        />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        {rows
          .filter(({ value }) => nonNullish(value))
          .map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>
                {Array.isArray(value) ? value.map((line) => <div key={line}>{line}</div>) : value}
              </dd>
            </div>
          ))}
      </dl>
    </div>
  );
};
