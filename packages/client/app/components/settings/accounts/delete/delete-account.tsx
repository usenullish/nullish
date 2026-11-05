import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { AccountsService } from "~/lib/services/accounts.services";
import { useAccountName } from "~/kit/data/accounts.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteAccount = ({
  account,
  open,
  onOpenChange,
  onDeleted,
}: {
  account: Api["Accounts"]["Client"]["Account"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => Promise<void>;
}) => {
  const { i18n } = useI18n();
  const accountName = useAccountName();

  return (
    <DeleteRecord
      delete={() => AccountsService.create().delete({ accountId: account.id })}
      texts={{
        title: replacePlaceholders(i18n.accounts.text.delete_title, {
          "{name}": `${account.code} ${accountName(account)}`,
        }),
        description: i18n.accounts.text.delete_description,
        success: i18n.accounts.toast.delete_success,
        error: i18n.accounts.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
    />
  );
};
