import { useState } from "react";
import { nonNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteOrganization } from "~/components/settings/organizations/delete/delete-organization";
import { useIsOrganizationAdmin } from "~/context/hooks/memberships.hooks";
import { Button } from "~/ui/components/button";
import { Field, FieldDescription, FieldLegend, FieldSet } from "~/ui/components/field";
import { useI18n } from "~/kit/i18n/i18n.context";

export const OrganizationDangerZone = ({
  organization,
}: {
  organization: Api["Organizations"]["Client"]["Organization"];
}) => {
  const { i18n } = useI18n();
  const isAdmin = useIsOrganizationAdmin({ organizationId: organization.id });
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!isAdmin || nonNullish(organization.deletedAt)) {
    return null;
  }

  return (
    <FieldSet className="mt-14">
      <FieldLegend>{i18n.organizations.label.danger_zone}</FieldLegend>
      <FieldDescription>{i18n.organizations.text.danger_zone}</FieldDescription>

      <Field>
        <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
          {i18n.organizations.action.delete}
        </Button>
      </Field>

      <DeleteOrganization
        organization={organization}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </FieldSet>
  );
};
