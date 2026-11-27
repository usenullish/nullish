import { useOrganization } from "~/context/contexts/organization.context";
import { OrganizationExport } from "~/components/settings/organizations/export/organization-export";

const OrganizationExportPage = () => {
  const organization = useOrganization();

  return <OrganizationExport organization={organization} />;
};

export default OrganizationExportPage;
