import { AuthGuard } from "~/components/auth/guards/auth-guard";
import { Outlet } from "react-router";
import { AppLayout } from "~/components/layout/app-layout";

const Layout = () => {
  return (
    <AppLayout>
      <AuthGuard>
        <Outlet />
      </AuthGuard>
    </AppLayout>
  );
};

export default Layout;
