import { Link } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "~/ui/components/button";
import { useOrganization } from "~/context/contexts/organization.context";
import { AccountingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const VatSettingsEmpty = () => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-xs text-muted-foreground">{i18n.vat.text.settings_not_configured}</p>

      <WriteGuard>
        <Button
          nativeButton={false}
          render={
            <Link
              to={AccountingPath.create({
                organizationId: organization.id,
              }).to({ path: "/vat/settings/new" })}
            />
          }
        >
          <Plus />
          {i18n.vat.action.settings_create}
        </Button>
      </WriteGuard>
    </div>
  );
};
