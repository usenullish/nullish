import { nonNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import type { OrganizationSetup } from "~/context/server/organizations+setup.server";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const SETUP_STEPS = ["organization", "vat"] as const;

export type SetupStepKey = (typeof SETUP_STEPS)[number];

type Organization = Pick<Api["Organizations"]["Client"]["Organization"], "id" | "name">;

export const setupPath = ({
  organizationId,
  step,
}: {
  organizationId: Organization["id"];
  step: "vat" | "ready";
}): string => `/orgs/${organizationId}/setup/${step}`;

export const useSetupDone = ({
  organization,
  setup,
}: {
  organization: Option<Organization>;
  setup: Option<OrganizationSetup>;
}): Record<SetupStepKey, Option<string>> => {
  const { i18n } = useI18n();

  return {
    organization: nonNullish(organization)
      ? replacePlaceholders(i18n.organizations.setup_done.organization, {
          "{name}": organization.name,
        })
      : undefined,
    vat: nonNullish(setup?.vatSetting) ? i18n.organizations.setup_done.vat : undefined,
  };
};
