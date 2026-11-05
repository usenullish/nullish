export type FormState<T = undefined> =
  | { name: "init" }
  | { name: "ready"; result: T }
  | { name: "error"; err: unknown };

export const INIT_FORM_STATE = { name: "init" } as const;

export type UseActionStateFn<T = undefined> = (
  prevState: FormState<T>,
  formData: FormData,
) => Promise<FormState<T>>;
