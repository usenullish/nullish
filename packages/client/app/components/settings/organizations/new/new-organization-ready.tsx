import { Button } from "~/ui/components/button";
import { Link } from "react-router";
import { Check } from "lucide-react";
import { useI18n } from "~/kit/i18n/i18n.context";
import type { UseNewOrganizationResult } from "~/context/form/new-organization.form";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

export const NewOrganizationReady = ({ result }: { result: UseNewOrganizationResult }) => {
  const { id, name } = result;
  const { i18n } = useI18n();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 pb-24 text-center">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {replacePlaceholders(i18n.organizations.text.ready, { "{name}": name })}
        <Check className="size-4" />
      </h2>

      <Button
        nativeButton={false}
        render={<Link to={`/orgs/${id}`} />}
        {...testId(testIds.newOrganization.ready)}
      >
        {i18n.organizations.action.lets_go}
      </Button>
    </div>
  );
};
