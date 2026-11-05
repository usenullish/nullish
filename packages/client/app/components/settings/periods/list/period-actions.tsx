import { useState } from "react";
import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { PeriodStatus } from "@usenullish/nullish-schema/db";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { ClosePeriod } from "~/components/settings/periods/close/close-period";
import { useOrganization } from "~/context/contexts/organization.context";
import { AccountingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const PeriodActions = ({ period }: { period: Api["Periods"]["Client"]["Period"] }) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const [closeOpen, setCloseOpen] = useState(false);

  const closable = period.status === PeriodStatus.OPEN;

  return (
    <RecordActions
      record={period}
      items={
        closable && (
          <>
            <WriteGuard>
              <DropdownMenuItem
                render={
                  <Link
                    to={AccountingPath.create({
                      organizationId: organization.id,
                    }).toSettings({ path: `/periods/${period.id}` })}
                  />
                }
              >
                {i18n.core.action.edit}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCloseOpen(true)}>
                {i18n.periods.action.close}
              </DropdownMenuItem>
            </WriteGuard>
          </>
        )
      }
    >
      {closable && <ClosePeriod period={period} open={closeOpen} onOpenChange={setCloseOpen} />}
    </RecordActions>
  );
};
