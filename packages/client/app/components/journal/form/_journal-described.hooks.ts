import { type FormEvent, startTransition, useState } from "react";
import type { Nullable } from "@usenullish/nullish-common";
import { isJournalDescribed } from "~/context/form/_journal.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const useJournalDescribed = ({
  onAction,
}: {
  onAction: (payload: FormData) => void;
}): {
  error: Nullable<string>;
  onSubmit: ($event: FormEvent<HTMLFormElement>) => void;
} => {
  const { i18n } = useI18n();
  const [error, setError] = useState<Nullable<string>>(null);

  const onSubmit = ($event: FormEvent<HTMLFormElement>) => {
    if (isJournalDescribed({ formData: new FormData($event.currentTarget) })) {
      startTransition(() => setError(null));
      buildFormSubmit({ onAction })($event);
      return;
    }

    $event.preventDefault();

    startTransition(() => setError(i18n.journal.text.missing_description));
  };

  return { error, onSubmit };
};
