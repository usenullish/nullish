import { startTransition, useState } from "react";
import { usePageRestore } from "~/kit/utils/page-restore.hook";
import { useOrganization } from "~/context/contexts/organization.context";
import { PaymentsManageService } from "~/lib/services/payments+manage.services";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { Button } from "~/ui/components/button";

export const ManageSubscription = () => {
  const { i18n } = useI18n();
  const { notifyError } = useNotify();
  const organization = useOrganization();

  const [pending, setPending] = useState(false);

  usePageRestore({ onRestore: () => startTransition(() => setPending(false)) });

  const manage = async () => {
    startTransition(() => setPending(true));

    const result = await PaymentsManageService.create().submit({ orgId: organization.id });

    if (result.status === "error") {
      notifyError({ msg: i18n.subscription.text.manage_error, detail: result.err });
      startTransition(() => setPending(false));
      return;
    }

    window.location.assign(result.result.url);
  };

  return (
    <Button type="button" className="self-start" disabled={pending} onClick={() => void manage()}>
      {i18n.subscription.action.manage}
    </Button>
  );
};
