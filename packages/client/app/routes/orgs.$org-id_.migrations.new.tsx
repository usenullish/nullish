import type { Route } from "./+types/orgs.$org-id_.migrations.new";
import { Navigate } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { MigrationStep } from "~/components/settings/migrations/wizard/migration-step";
import { MigrationSource } from "~/components/settings/migrations/wizard/migration-source";
import { useOrganizations } from "~/context/contexts/organizations.context";
import { NonNullishOrganizationContext } from "~/context/contexts/organization.context";
import { useCanWrite } from "~/context/hooks/memberships.hooks";
import { OrganizationPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

// /orgs/:orgId/migrations/new
const NewMigrationPage = ({ params }: Route.ComponentProps) => {
  const organizations = useOrganizations();
  const organization = organizations?.find(({ id }) => id === params["org-id"]);

  if (isNullish(organization)) {
    return <Navigate to="/orgs" replace />;
  }

  return (
    <NonNullishOrganizationContext.Provider value={organization}>
      <NewMigration organization={organization} />
    </NonNullishOrganizationContext.Provider>
  );
};

const NewMigration = ({
  organization,
}: {
  organization: Api["Organizations"]["Client"]["Organization"];
}) => {
  const { i18n } = useI18n();
  const canWrite = useCanWrite({ organizationId: organization.id });

  const backTo = OrganizationPath.create({ organizationId: organization.id }).to({
    path: "/migrations",
  });

  if (!canWrite) {
    return <Navigate to={backTo} replace />;
  }

  return (
    <MigrationStep
      title={i18n.migrations.text.new_title}
      closeTo={backTo}
      current="source"
      intro={i18n.migrations.text.source_title}
    >
      <MigrationSource organizationId={organization.id} />
    </MigrationStep>
  );
};

export default NewMigrationPage;
