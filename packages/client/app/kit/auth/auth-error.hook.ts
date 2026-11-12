import { AuthErrorSchema } from "@usenullish/nullish-auth/client";
import { useI18n } from "~/kit/i18n/i18n.context";
import { I18nSchema } from "~/kit/i18n/i18n";

const AuthErrorKeySchema = I18nSchema.shape.auth.shape.error.keyof();

export const useAuthErrorMessage = () => {
  const { i18n } = useI18n();

  return ({ code, message }: { code?: string; message: string }): string => {
    const betterAuthError = AuthErrorKeySchema.safeParse(code?.toLowerCase());

    if (betterAuthError.success) {
      return i18n.auth.error[betterAuthError.data];
    }

    const { success, data } = AuthErrorSchema.safeParse(message);
    return success ? i18n.auth.error[data] : message;
  };
};
