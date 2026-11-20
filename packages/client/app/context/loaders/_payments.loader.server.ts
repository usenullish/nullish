import { type LoaderFunctionArgs, redirect } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { SettingsCache } from "~/context/caches/settings.cache";
import { OrganizationPath, UnscopedPath } from "~/navigation";

export const assertPaymentsEnabled = async ({ params }: LoaderFunctionArgs): Promise<void> => {
  const { settings } = await SettingsCache.getInstance().get();

  if (settings.payments.enabled) {
    return;
  }

  const organizationId = params["org-id"];

  throw redirect(
    isNullish(organizationId)
      ? UnscopedPath.create().toOrganizations()
      : OrganizationPath.create({ organizationId }).to(),
  );
};
