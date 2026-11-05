import { startTransition, useEffect, useState, ViewTransition } from "react";
import { Link, useLocation, useNavigate, useRevalidator } from "react-router";
import {
  isEmptyString,
  isNullish,
  nonNullish,
  type Nullable,
  type Option,
} from "@usenullish/nullish-common";
import { authClient } from "@usenullish/nullish-auth/client";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/ui/components/card";
import { EnvironmentTag } from "~/components/core/environment-tag";
import { Field, FieldError, FieldGroup } from "~/ui/components/field";
import { CenteredLayout } from "~/components/layout/centered-layout";
import { useAuthPending, useSignedIn } from "~/context/hooks/auth.hooks";
import { InvitationsService } from "~/lib/services/invitations.services";
import { AUTH_NAVIGATION } from "~/navigation";
import { errorReason } from "~/kit/error-drawer/errors.utils";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useNotify } from "~/kit/notifications/notify.hook";
import type { AuthRedirectState } from "~/kit/auth/auth-redirect.hook";

type Invitation = Api["InvitationsPreview"]["Client"]["PreviewInvitationResponse"];

export const AcceptInvitation = () => {
  const { i18n } = useI18n();
  const { hash } = useLocation();

  const signedIn = useSignedIn();
  const authPending = useAuthPending();

  const token = hash.slice(1);

  if (authPending) {
    return null;
  }

  if (isEmptyString(token)) {
    return (
      <InvitationCard description={i18n.invitations.text.invalid_link}>
        <BackToHome />
      </InvitationCard>
    );
  }

  if (!signedIn) {
    const state: AuthRedirectState = { invitationToken: token };

    return (
      <InvitationCard description={i18n.invitations.text.sign_in}>
        <Field>
          <Button nativeButton={false} render={<Link to={AUTH_NAVIGATION.signIn} state={state} />}>
            {i18n.auth.action.sign_in}
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to={AUTH_NAVIGATION.signUp} state={state} />}
          >
            {i18n.auth.action.sign_up}
          </Button>
        </Field>
      </InvitationCard>
    );
  }

  return <InvitationPrompt token={token} />;
};

const InvitationPrompt = ({ token }: { token: string }) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const { refetch } = authClient.useSession();

  const [invitation, setInvitation] = useState<Option<Invitation>>(undefined);
  const [error, setError] = useState<Nullable<string>>(null);
  const [pending, setPending] = useState<Nullable<"accept" | "decline">>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const result = await InvitationsService.create().preview({ token });

      if (!active) {
        return;
      }

      startTransition(() => {
        if (result.status === "error") {
          setError(errorReason(result.err) ?? i18n.invitations.text.load_error);
          return;
        }

        setInvitation(result.result);
      });
    };

    void load();

    return () => {
      active = false;
    };
  }, [token, i18n]);

  const accept = async () => {
    setPending("accept");
    startTransition(() => setError(null));

    const result = await InvitationsService.create().accept({ token });

    if (result.status === "error") {
      setPending(null);
      startTransition(() =>
        setError(errorReason(result.err) ?? i18n.invitations.toast.accept_error),
      );
      return;
    }

    await Promise.all([revalidate(), refetch()]);

    notifySuccess({
      msg: replacePlaceholders(i18n.invitations.toast.accept_success, {
        "{organization}": invitation?.organizationName ?? "",
      }),
    });

    await navigate(`/orgs/${result.result.membership.organizationId}`, { replace: true });
  };

  const decline = async () => {
    setPending("decline");
    startTransition(() => setError(null));

    const result = await InvitationsService.create().decline({ token });

    if (result.status === "error") {
      setPending(null);
      startTransition(() =>
        setError(errorReason(result.err) ?? i18n.invitations.toast.decline_error),
      );
      return;
    }

    await navigate("/", { replace: true });
  };

  if (nonNullish(error) && isNullish(invitation)) {
    return (
      <InvitationCard description={error}>
        <BackToHome />
      </InvitationCard>
    );
  }

  if (isNullish(invitation)) {
    return null;
  }

  return (
    <InvitationCard
      description={replacePlaceholders(i18n.invitations.text.invited, {
        "{organization}": invitation.organizationName,
      })}
    >
      {nonNullish(error) && (
        <ViewTransition>
          <FieldError>{error}</FieldError>
        </ViewTransition>
      )}

      <Field>
        <Button onClick={accept} disabled={nonNullish(pending)}>
          {pending === "accept" ? i18n.invitations.state.accepting : i18n.invitations.action.accept}
        </Button>
        <Button variant="outline" onClick={decline} disabled={nonNullish(pending)}>
          {pending === "decline"
            ? i18n.invitations.state.declining
            : i18n.invitations.action.decline}
        </Button>
      </Field>
    </InvitationCard>
  );
};

const BackToHome = () => {
  const { i18n } = useI18n();

  return (
    <Field>
      <Button nativeButton={false} render={<Link to="/" replace />}>
        {i18n.invitations.action.back_home}
      </Button>
    </Field>
  );
};

const InvitationCard = ({
  description,
  children,
}: {
  description: string;
  children?: React.ReactNode;
}) => (
  <CenteredLayout>
    <Card className="w-full max-w-sm">
      <CardHeader>
        <EnvironmentTag className="mb-3 justify-self-end" />
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      {nonNullish(children) && (
        <CardContent>
          <FieldGroup>{children}</FieldGroup>
        </CardContent>
      )}
    </Card>
  </CenteredLayout>
);
