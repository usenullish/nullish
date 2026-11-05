import { ThemeToggle } from "~/components/core/theme-toggle";
import { EnvironmentTag } from "~/components/core/environment-tag";
import { NotificationsIndicator } from "~/components/notifications/notifications-indicator";

export const HeaderActions = () => (
  <div className="ml-auto flex items-center gap-1">
    <EnvironmentTag />
    <NotificationsIndicator />
    <ThemeToggle />
  </div>
);
