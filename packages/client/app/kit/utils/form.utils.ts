import { type FormEvent, startTransition } from "react";

export const buildFormSubmit =
  ({ onAction }: { onAction: (payload: FormData) => void }) =>
  ($event: FormEvent<HTMLFormElement>) => {
    $event.preventDefault();

    const { submitter } = $event.nativeEvent as SubmitEvent;
    const formData = new FormData($event.currentTarget, submitter);

    startTransition(() => onAction(formData));
  };
