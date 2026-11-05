import { tryCatch } from "@usenullish/nullish-common";
import { useNotify } from "~/kit/notifications/notify.hook";
import type { FormState, UseActionStateFn } from "~/context/form/form";

export const useActionWithNotifyError = <T = undefined>({
  action,
  errorMsg,
}: {
  action: UseActionStateFn<T>;
  errorMsg: string;
}): UseActionStateFn<T> => {
  const { notifyError } = useNotify();

  return async (prevState, formData) => {
    const result = await tryCatch(async () => {
      return await action(prevState, formData);
    });

    const state: FormState<T> =
      result.status === "error" ? { name: "error", err: result.err } : result.result;

    if (state.name === "error") {
      notifyError({ msg: errorMsg, detail: state.err });
    }

    return state;
  };
};
