import { AuthGuard } from "~/components/auth/guards/auth-guard";
import { HomeContent } from "~/components/home/home-content";
import { HomeLayout } from "~/components/layout/home-layout";
import { AppLayout } from "~/components/layout/app-layout";

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
