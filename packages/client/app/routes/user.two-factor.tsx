import { useLocation } from "react-router";
import { TwoFactorSetup } from "~/components/user/two-factor/two-factor-setup";
import { WizardLayout } from "~/components/layout/wizard-layout";
import { useI18n } from "~/kit/i18n/i18n.context";

const UserTwoFactorPage = () => {
  const { i18n } = useI18n();

  const location = useLocation();
  const from = location.state?.from?.pathname;
  const closeTo = from ?? "/";

  return (
    <WizardLayout title={i18n.two_factor.text.title} closeTo={closeTo}>
      <TwoFactorSetup closeTo={closeTo} />
    </WizardLayout>
  );
};

export default UserTwoFactorPage;
