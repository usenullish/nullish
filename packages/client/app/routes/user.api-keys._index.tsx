import type { Route } from "./+types/user.api-keys._index";
import { Link, useLocation } from "react-router";
import { Plus } from "lucide-react";
import { UserApiKeysServer } from "~/context/server/user+api-keys.server";
import { ApiKeysTable } from "~/components/user/api-keys/list/api-keys-table";
import { WizardLayout } from "~/components/layout/wizard-layout";
import { Button } from "~/ui/components/button";
import { useI18n } from "~/kit/i18n/i18n.context";

export const loader = async (args: Route.LoaderArgs) => {
  return await UserApiKeysServer.create().list(args);
};

const UserApiKeysPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();

  const location = useLocation();
  const from = location.state?.from?.pathname;
  const closeTo = from ?? "/";

  return (
    <WizardLayout title={i18n.api_keys.text.title} closeTo={closeTo}>
      <div className="flex justify-end">
        <Button nativeButton={false} render={<Link to="/user/api-keys/new" />}>
          <Plus />
          {i18n.api_keys.action.create}
        </Button>
      </div>

      <ApiKeysTable apiKeys={loaderData?.apiKeys ?? []} />
    </WizardLayout>
  );
};

export default UserApiKeysPage;
