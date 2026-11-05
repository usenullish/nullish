import type { DefineRawHandler } from "../types/raw-api";

export const defineAuth: DefineRawHandler = async (context) => {
  const {
    var: { auth },
    req: { raw },
  } = context;

  return auth.handler(raw);
};
