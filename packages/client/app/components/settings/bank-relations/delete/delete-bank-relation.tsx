import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { BankRelationsService } from "~/lib/services/bank-relations.services";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteBankRelation = ({
  bankRelation,
  open,
  onOpenChange,
  onDeleted,
}: {
  bankRelation: Api["BankRelations"]["Client"]["BankRelation"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => Promise<void>;
}) => {
  const { i18n } = useI18n();

  return (
    <DeleteRecord
      delete={() => BankRelationsService.create().delete({ bankRelationId: bankRelation.id })}
      texts={{
        title: replacePlaceholders(i18n.bank_relations.text.delete_title, {
          "{name}": bankRelation.name,
        }),
        description: i18n.bank_relations.text.delete_description,
        success: i18n.bank_relations.toast.delete_success,
        error: i18n.bank_relations.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
    />
  );
};
