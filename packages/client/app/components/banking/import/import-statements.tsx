import { useActionState, useId } from "react";
import { useNavigate } from "react-router";
import { useOrganization } from "~/context/contexts/organization.context";
import { BankingPath } from "~/navigation";
import type { Api } from "@usenullish/nullish-schema/server";
import { BANK_STATEMENT_FILE_MAX_SIZE } from "@usenullish/nullish-schema/server";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseImportStatementsAction } from "~/context/form/import-statements.form";
import { Button } from "~/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "~/ui/components/field";
import { FileInput } from "~/components/core/file-input";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { buildFormSubmit } from "~/kit/utils/form.utils";

type ImportStatementsResponse = Api["BankRelations"]["Client"]["ImportStatementsResponse"];

const MAX_SIZE_IN_MB = BANK_STATEMENT_FILE_MAX_SIZE / (1024 * 1024);

export const ImportStatements = ({
  bankRelation,
  open,
  onOpenChange,
}: {
  bankRelation: Api["BankRelations"]["Client"]["BankRelation"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const fileId = useId();
  const navigate = useNavigate();
  const organization = useOrganization();

  const importStatementsAction = buildUseImportStatementsAction({
    bankRelationId: bankRelation.id,
  });

  const importAction = useActionWithNotifyError<ImportStatementsResponse>({
    action: async (prevState, formData) => {
      const state = await importStatementsAction(prevState, formData);

      if (state.name === "ready") {
        const {
          statements: { processed },
          movements: { inserted, existing },
        } = state.result;

        notifySuccess({
          msg:
            processed === 0
              ? i18n.bank_relations.toast.import_already
              : replacePlaceholders(i18n.bank_relations.toast.import_success, {
                  "{inserted}": `${inserted}`,
                  "{existing}": `${existing}`,
                }),
        });

        onOpenChange(false);

        await navigate(
          BankingPath.create({ organizationId: organization.id }).to({
            path:
              inserted > 0
                ? `/${bankRelation.id}/reconcile`
                : `/${bankRelation.id}?status=unreconciled`,
          }),
        );
      }

      return state;
    },
    errorMsg: i18n.bank_relations.toast.import_error,
  });

  const [, onAction, pending] = useActionState<FormState<ImportStatementsResponse>, FormData>(
    importAction,
    INIT_FORM_STATE,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={buildFormSubmit({ onAction })}>
          <FieldGroup>
            <DialogHeader>
              <DialogTitle>
                {replacePlaceholders(i18n.bank_relations.text.upload_title, {
                  "{name}": bankRelation.name,
                })}
              </DialogTitle>
              <DialogDescription>
                {replacePlaceholders(i18n.bank_relations.text.upload_description, {
                  "{size}": `${MAX_SIZE_IN_MB}`,
                })}
              </DialogDescription>
            </DialogHeader>

            <Field>
              <FieldLabel htmlFor={fileId}>{i18n.bank_relations.label.file}</FieldLabel>
              <FileInput id={fileId} name="file" accept=".xml" required />
            </Field>

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending
                  ? i18n.bank_relations.state.uploading
                  : i18n.bank_relations.action.upload_file}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
};
