import { Toaster } from "~/ui/components/sonner";
import { NotificationsDrawer } from "~/components/notifications/notifications-drawer";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}

      <Toaster richColors />
      <NotificationsDrawer />
    </>
  );
};
