import { useState } from "react";
import { Link } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { CenteredLayout } from "~/components/layout/centered-layout";
import { DeleteOrganization } from "~/components/settings/organizations/delete/delete-organization";
import { useOrganization } from "~/context/contexts/organization.context";
import { useIsOrganizationAdmin } from "~/context/hooks/memberships.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { Button } from "~/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/ui/components/card";

export const OrganizationLocked = () => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const isAdmin = useIsOrganizationAdmin({ organizationId: organization.id });
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <CenteredLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">{i18n.organizations.text.locked_title}</CardTitle>
          <CardDescription>{i18n.organizations.text.locked_description}</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-2">
          <Button className="w-full" nativeButton={false} render={<Link to="/orgs" />}>
            {i18n.organizations.action.back_to_organizations}
          </Button>

          {isAdmin && isNullish(organization.deletedAt) && (
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => setDeleteOpen(true)}
            >
              {i18n.organizations.action.delete}
            </Button>
          )}
        </CardContent>
      </Card>

      <DeleteOrganization
        organization={organization}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </CenteredLayout>
  );
};
