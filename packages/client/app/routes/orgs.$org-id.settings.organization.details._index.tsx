import { useOrganization } from "~/context/contexts/organization.context";
import { OrganizationEdit } from "~/components/settings/organizations/edit/organization-edit";

const OrganizationSettingsPage = () => {
  const organization = useOrganization();

  return <OrganizationEdit organization={organization} />;
};

export default OrganizationSettingsPage;
