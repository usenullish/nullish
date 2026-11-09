import { createContext, type MiddlewareFunction } from "react-router";
import { OrganizationsLoader } from "~/context/loaders/organizations.loader.server";

export const organizationsLoaderContext = createContext<OrganizationsLoader>();

// We are loading the organizations at the root.tsx because those are used for various features (see useOrganizations) but,
// we also need those in the _index.tsx route because we want to redirect **on the server side** the user from the root page
// to their org if they have only one organization.
export const organizationsLoaderMiddleware: MiddlewareFunction = async (args, next) => {
  args.context.set(organizationsLoaderContext, OrganizationsLoader.create(args));

  return next();
};
