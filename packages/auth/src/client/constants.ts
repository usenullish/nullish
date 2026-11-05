import { TWO_FACTOR_CONFIG } from "../_constants";

export const TWO_FACTOR_TOTP = {
  digits: TWO_FACTOR_CONFIG.totpOptions.digits,
  period: TWO_FACTOR_CONFIG.totpOptions.period,
};

export const TWO_FACTOR_TRUST_DEVICE = {
  days: TWO_FACTOR_CONFIG.trustDeviceMaxAge / (24 * 60 * 60),
};

export const TWO_FACTOR_BACKUP_CODE = {
  length: TWO_FACTOR_CONFIG.backupCodeOptions.length,
  // Hardcoded in Better Auth: the backup codes are shown and stored with a dash after the 5th
  // character, e.g. "aB3dE-fG7hJ", whatever their length.
  // We use it in the UI to show an input-otp component fields.
  dashIndex: 5,
};
