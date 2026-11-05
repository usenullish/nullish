import { useId } from "react";
import { Info } from "lucide-react";
import { CopyIcon } from "~/components/core/copy-icon";
import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Alert, AlertDescription } from "~/ui/components/alert";
import { Field, FieldGroup, FieldLabel } from "~/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/ui/components/input-group";
import { useOrganization } from "~/context/contexts/organization.context";
import { INVITATION_ACCEPT_PATH, OrganizationPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useCopy } from "~/kit/utils/copy.hook";

export const InvitationCreated = ({
  created: { invitation, token },
}: {
  created: Api["InvitationsCreate"]["Client"]["CreateInvitationResponse"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const formatDate = useFormatDate();
  const linkId = useId();

  const { copy: copyToClipboard, copied } = useCopy();

  const link = `${window.location.origin}${INVITATION_ACCEPT_PATH}#${token}`;

  const copy = async () => {
    await copyToClipboard(link);
  };

  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={linkId}>{i18n.invitations.text.created_title}</FieldLabel>
          <InputGroup>
            <InputGroupInput id={linkId} value={link} readOnly className="font-mono" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label={i18n.core.action.copy} onClick={copy}>
                <CopyIcon copied={copied} />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Alert>
          <Info />
          <AlertDescription>
            {replacePlaceholders(i18n.invitations.text.created_description, {
              "{email}": invitation.email,
              "{date}": formatDate(invitation.expiresAt),
            })}
          </AlertDescription>
        </Alert>

        <Field>
          <Button
            nativeButton={false}
            render={
              <Link
                to={OrganizationPath.create({ organizationId: organization.id }).to({
                  path: "/team/invitations",
                })}
              />
            }
          >
            {i18n.invitations.action.done}
          </Button>
        </Field>
      </FieldGroup>
    </div>
  );
};
