import type { Route } from "./+types/_index";
import { redirect } from "react-router";
import { isArrayExactlyOne } from "@usenullish/nullish-common";
import { organizationsLoaderContext } from "~/context/middlewares/organizations";
import { OrganizationPath } from "~/navigation";
import { AuthGuard } from "~/components/auth/guards/auth-guard";
import { HomeContent } from "~/components/home/home-content";
import { HomeLayout } from "~/components/layout/home-layout";
import { AppLayout } from "~/components/layout/app-layout";

// TODO: metadata
export function meta(_args: Route.MetaArgs) {
  return [{ title: "nullish" }, { name: "description", content: "Welcome to React Router!" }];
}

export const loader = async ({ context }: Route.LoaderArgs) => {
  const { organizations } = (await context.get(organizationsLoaderContext).listAll()) ?? {
    organizations: [],
  };

  // The user has exactly one and only organizations so we redirect it to it.
  // This is handy in production because the authentication least few days so returning user won't have to
  // reselect their org each time.
  return isArrayExactlyOne(organizations)
    ? redirect(OrganizationPath.create({ organizationId: organizations[0].id }).to())
    : null;
};

const Home = () => {
  return (
    <AppLayout>
      <AuthGuard>
        <HomeLayout>
          <HomeContent />
        </HomeLayout>
      </AuthGuard>
    </AppLayout>
  );
};

export default Home;
