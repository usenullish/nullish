import { NewApiKey } from "~/components/user/api-keys/new/new-api-key";
import { WizardLayout } from "~/components/layout/wizard-layout";
import { useI18n } from "~/kit/i18n/i18n.context";

const NewApiKeyPage = () => {
  const { i18n } = useI18n();

  return (
    <WizardLayout title={i18n.api_keys.text.create_title} closeTo="/user/api-keys">
      <NewApiKey />
    </WizardLayout>
  );
};

export default NewApiKeyPage;
