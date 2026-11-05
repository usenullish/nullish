import { Link } from "react-router";
import { Button } from "~/ui/components/button";
import { useGreeting } from "~/kit/user/greeting.hooks";
import { useUser } from "~/context/hooks/auth.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

export const NoOrganization = () => {
  const { i18n } = useI18n();
  const user = useUser();
  const greeting = useGreeting({ name: user?.name });

  return (
    <section className="mx-auto flex h-[calc(100svh-5rem)] w-full max-w-3xl flex-col items-start justify-center gap-3">
      <h2 className="min-h-5 text-sm font-semibold">{greeting ?? ""}</h2>

      <p className="text-xs text-muted-foreground">{i18n.organizations.text.intro}</p>

      <Button nativeButton={false} render={<Link to="/orgs/new" />}>
        {i18n.organizations.action.create}
      </Button>
    </section>
  );
};
