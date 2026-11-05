import { useState } from "react";
import { type Privacy, savePrivacy } from "~/kit/privacy/privacy.services";
import { NonNullishPrivacyContext } from "~/kit/privacy/privacy.context";

export interface PrivacyProviderState {
  privacy: Privacy;
  toggle: () => void;
}

export const PrivacyProvider = ({
  children,
  initialPrivacy,
}: {
  children: React.ReactNode;
  initialPrivacy: Privacy;
}) => {
  const [privacy, setPrivacy] = useState<Privacy>(initialPrivacy);

  const value: PrivacyProviderState = {
    privacy,
    toggle: () => {
      const newPrivacy: Privacy = {
        enabled: !privacy.enabled,
      };

      void savePrivacy({ privacy: newPrivacy });
      setPrivacy(newPrivacy);
    },
  };

  return (
    <NonNullishPrivacyContext.Provider value={value}>{children}</NonNullishPrivacyContext.Provider>
  );
};
