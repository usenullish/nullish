import { useLocation } from "react-router";
import { ChangePassword } from "~/components/user/password/change-password";
import { WizardLayout } from "~/components/layout/wizard-layout";
import { useI18n } from "~/kit/i18n/i18n.context";

const UserPasswordPage = () => {
  const { i18n } = useI18n();

  const location = useLocation();
  const from = location.state?.from?.pathname;
  const closeTo = from ?? "/";

  return (
    <WizardLayout title={i18n.auth.text.change_password_title} closeTo={closeTo}>
      <ChangePassword closeTo={closeTo} />
    </WizardLayout>
  );
};

export default UserPasswordPage;
