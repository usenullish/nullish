import { Link, Outlet, useLocation } from "react-router";
import { isArrayEmpty } from "@usenullish/nullish-common";
import { WizardLayout } from "~/components/layout/wizard-layout";
import { useAssistant } from "~/context/contexts/assistant.context";
import { useLlmUsage } from "~/context/contexts/llm-usage.context";
import { Tabs, TabsList, TabsTrigger } from "~/ui/components/tabs";
import { useI18n } from "~/kit/i18n/i18n.context";

const ACCOUNT_PATH = "/user/settings/account";
const USAGE_PATH = "/user/settings/usage";

const UserSettingsLayout = () => {
  const { i18n } = useI18n();
  const { enabled } = useAssistant();
  const usage = useLlmUsage();

  const location = useLocation();
  const from = location.state?.from?.pathname;
  const closeTo = from ?? "/";

  const tabs = [
    { path: ACCOUNT_PATH, label: i18n.profile.label.account },
    ...(enabled || !isArrayEmpty(usage ?? [])
      ? [{ path: USAGE_PATH, label: i18n.usage.text.title }]
      : []),
  ];

  return (
    <WizardLayout title={i18n.navigation.settings} closeTo={closeTo}>
      <Tabs value={location.pathname}>
        <TabsList variant="line">
          {tabs.map(({ path, label }) => (
            <TabsTrigger
              key={path}
              value={path}
              nativeButton={false}
              render={<Link to={path} state={location.state} replace />}
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-8">
        <Outlet />
      </div>
    </WizardLayout>
  );
};

export default UserSettingsLayout;
