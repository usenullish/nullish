import type { Route } from "./+types/_index";
import { AuthGuard } from "~/components/auth/guards/auth-guard";
import { HomeContent } from "~/components/home/home-content";
import { HomeLayout } from "~/components/layout/home-layout";
import { AppLayout } from "~/components/layout/app-layout";

// TODO: metadata
export function meta(_args: Route.MetaArgs) {
  return [{ title: "nullish" }, { name: "description", content: "Welcome to React Router!" }];
}

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
