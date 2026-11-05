import { useState } from "react";
import { DeleteUser } from "~/components/user/delete/delete-user";
import { Button } from "~/ui/components/button";
import { Field, FieldDescription, FieldLegend, FieldSet } from "~/ui/components/field";
import { useI18n } from "~/kit/i18n/i18n.context";

export const ProfileDangerZone = () => {
  const { i18n } = useI18n();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <FieldSet className="mt-14">
      <FieldLegend>{i18n.profile.label.danger_zone}</FieldLegend>
      <FieldDescription>{i18n.profile.text.danger_zone}</FieldDescription>

      <Field>
        <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
          {i18n.profile.action.delete}
        </Button>
      </Field>

      <DeleteUser open={deleteOpen} onOpenChange={setDeleteOpen} />
    </FieldSet>
  );
};
