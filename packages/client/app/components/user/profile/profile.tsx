import { useId } from "react";
import { Link, useLocation } from "react-router";
import { useUser } from "~/context/hooks/auth.hooks";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { useI18n } from "~/kit/i18n/i18n.context";

export const Profile = () => {
  const { i18n } = useI18n();
  const user = useUser();
  const location = useLocation();
  const id = useId();

  const fieldId = (name: string) => `${id}-${name}`;

  const name = user?.name ?? "";
  const email = user?.email ?? "";

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={fieldId("name")}>{i18n.core.label.name}</FieldLabel>
        <Input id={fieldId("name")} value={name} disabled readOnly />
      </Field>

      <Field>
        <FieldLabel htmlFor={fieldId("email")}>{i18n.core.label.email}</FieldLabel>
        <Input id={fieldId("email")} value={email} disabled readOnly />
      </Field>

      <Field>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/user/password" state={{ from: location }} />}
        >
          {i18n.auth.action.change_password}
        </Button>
      </Field>
    </FieldGroup>
  );
};
