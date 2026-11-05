import type { Route } from "./+types/orgs.$org-id.accounting.vat.settings._index";
import { isNullish } from "@usenullish/nullish-common";
import { VatSettingsServer } from "~/context/server/vat+settings.server";
import { VatSettingsEmpty } from "~/components/settings/vat/settings/empty/vat-settings-empty";
import { VatSettingEdit } from "~/components/settings/vat/settings/edit/vat-setting-edit";

export const loader = async (args: Route.LoaderArgs) => {
  return await VatSettingsServer.create().listVatSettings(args);
};

const OrganizationVatSettingsPage = ({ loaderData }: Route.ComponentProps) => {
  const [setting] = loaderData?.settings ?? [];

  return isNullish(setting) ? <VatSettingsEmpty /> : <VatSettingEdit setting={setting} />;
};

export default OrganizationVatSettingsPage;
