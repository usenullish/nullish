import { AuthErrorSchema } from "@usenullish/nullish-auth/client";
import { useI18n } from "~/kit/i18n/i18n.context";

export const useAuthErrorMessage = () => {
  const { i18n } = useI18n();

  return (message: string): string => {
    const { success, data } = AuthErrorSchema.safeParse(message);
    return success ? i18n.auth.error[data] : message;
  };
};
