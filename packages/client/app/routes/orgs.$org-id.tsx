import type { Route } from "./+types/orgs.$org-id";
import { useOrganizations } from "~/context/contexts/organizations.context";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate, Outlet, type ShouldRevalidateFunction } from "react-router";
import { NonNullishOrganizationContext } from "~/context/contexts/organization.context";
import { OrganizationLayout } from "~/components/layout/organization-layout";
import { WriteRouteGuard } from "~/components/auth/guards/write-route-guard";
import { AccountsContext } from "~/context/contexts/accounts.context";
import { AccountingSettingsContext } from "~/context/contexts/accounting-settings.context";
import { BillingSettingsContext } from "~/context/contexts/billing-settings.context";
import { ClientsContext } from "~/context/contexts/clients.context";
import { loadOrganizationData } from "~/context/loaders/organization.loader.server";

export const loader = async (args: Route.LoaderArgs) => {
  return await loadOrganizationData(args);
};

export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentParams,
  nextParams,
  currentUrl,
  nextUrl,
}) => currentParams["org-id"] !== nextParams["org-id"] || currentUrl.href === nextUrl.href;

const Layout = ({ loaderData }: Route.ComponentProps) => {
  const organizations = useOrganizations();
  const organization = organizations?.find((org) => org.id === loaderData.orgId);

  if (isNullish(organization)) {
    return <Navigate to="/orgs" replace />;
  }

  return (
    <NonNullishOrganizationContext.Provider value={organization}>
      <AccountsContext.Provider value={loaderData.accounts}>
        <AccountingSettingsContext.Provider value={loaderData.accountingSettings}>
          <BillingSettingsContext.Provider value={loaderData.billingSettings}>
            <ClientsContext.Provider value={loaderData.clients}>
              <OrganizationLayout>
                <WriteRouteGuard>
                  <Outlet />
                </WriteRouteGuard>
              </OrganizationLayout>
            </ClientsContext.Provider>
          </BillingSettingsContext.Provider>
        </AccountingSettingsContext.Provider>
      </AccountsContext.Provider>
    </NonNullishOrganizationContext.Provider>
  );
};

export default Layout;
