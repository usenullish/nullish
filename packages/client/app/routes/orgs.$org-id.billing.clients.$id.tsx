import type { Route } from "./+types/orgs.$org-id.billing.clients.$id";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate, Outlet } from "react-router";
import { NonNullishClientContext } from "~/context/contexts/client.context";
import { ClientsServer } from "~/context/server/clients.server";
import { useOrganization } from "~/context/contexts/organization.context";

export const loader = async (args: Route.LoaderArgs) => {
  return ClientsServer.create().getClient(args);
};

// TODO: create guard component?
const ClientPage = ({ loaderData }: Route.ComponentProps) => {
  const organization = useOrganization();
  const { client } = loaderData ?? { client: undefined };

  if (isNullish(client)) {
    return <Navigate to={`/orgs/${organization.id}`} replace />;
  }

  return (
    <NonNullishClientContext.Provider value={client}>
      <Outlet />
    </NonNullishClientContext.Provider>
  );
};

export default ClientPage;
