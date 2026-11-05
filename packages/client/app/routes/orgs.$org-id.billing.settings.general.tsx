import type { Route } from "./+types/orgs.$org-id.billing.settings.general";
import { isNullish } from "@usenullish/nullish-common";
import { useBillingSettings } from "~/context/contexts/billing-settings.context";
import { VatRatesServer } from "~/context/server/vat+rates.server";
import { BankRelationsServer } from "~/context/server/bank-relations.server";
import { BillingSettingsEdit } from "~/components/settings/billing/edit/billing-settings-edit";

export const loader = async (args: Route.LoaderArgs) => {
  const [vatRates, bankRelations] = await Promise.all([
    VatRatesServer.create().listAllVatRates(args),
    BankRelationsServer.create().listAllBankRelations(args),
  ]);

  return { vatRates, bankRelations };
};

const BillingSettingsPage = ({ loaderData }: Route.ComponentProps) => {
  const billingSettings = useBillingSettings();

  if (isNullish(billingSettings)) {
    return null;
  }

  return (
    <BillingSettingsEdit
      billingSettings={billingSettings}
      vatRates={loaderData.vatRates?.rates ?? []}
      bankRelations={loaderData.bankRelations?.bankRelations ?? []}
    />
  );
};

export default BillingSettingsPage;
