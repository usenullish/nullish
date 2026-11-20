import { useState } from "react";
import { Link } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { SUBSCRIPTION_PLANS_PATH } from "@usenullish/nullish-schema/server";
import { OrganizationPath, UnscopedPath } from "~/navigation";
import { CenteredLayout } from "~/components/layout/centered-layout";
import { OrganizationDeletedBanner } from "~/components/layout/organization-deleted-banner";
import { DeleteOrganization } from "~/components/settings/organizations/delete/delete-organization";
import { useOrganization } from "~/context/contexts/organization.context";
import { useIsOrganizationAdmin } from "~/context/hooks/memberships.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { Button } from "~/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/ui/components/card";

export const OrganizationLocked = () => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const isAdmin = useIsOrganizationAdmin({ organizationId: organization.id });
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-x-0 top-0">
        <OrganizationDeletedBanner />
      </div>

      <CenteredLayout>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              {replacePlaceholders(i18n.organizations.text.locked_title, {
                "{name}": organization.name,
              })}
            </CardTitle>
            <CardDescription>{i18n.organizations.text.locked_description}</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-2">
            {isAdmin && isNullish(organization.deletedAt) && (
              <Button
                className="w-full"
                nativeButton={false}
                render={
                  <Link
                    to={OrganizationPath.create({ organizationId: organization.id }).to({
                      path: SUBSCRIPTION_PLANS_PATH,
                    })}
                  />
                }
              >
                {i18n.organizations.action.see_plans}
              </Button>
            )}

            <Button
              className="w-full"
              variant={isAdmin && isNullish(organization.deletedAt) ? "outline" : "default"}
              nativeButton={false}
              render={<Link to={UnscopedPath.create().toOrganizations()} />}
            >
              {i18n.organizations.action.back_to_organizations}
            </Button>

            {isAdmin && isNullish(organization.deletedAt) && (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteOpen(true)}
                >
                  {i18n.organizations.action.delete}
                </Button>

                <DeleteOrganization
                  organization={organization}
                  open={deleteOpen}
                  onOpenChange={setDeleteOpen}
                />
              </>
            )}
          </CardContent>
        </Card>
      </CenteredLayout>
    </>
  );
};
