import { useI18n } from "~/kit/i18n/i18n.context";
import type { Legal } from "~/kit/legal/legal.services";

export const SignUpLegal = ({ legal: { termsUrl, privacyUrl } }: { legal: Legal }) => {
  const { i18n } = useI18n();

  return (
    <p className="mt-2 max-w-sm text-center text-xs leading-relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-2 [&>a:hover]:text-foreground">
      {i18n.auth.text.legal.split(/(\{terms\}|\{privacy\})/).map((part) => {
        switch (part) {
          case "{terms}":
            return (
              <a
                key={part}
                href={termsUrl.replace("{lang}", i18n.lang)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {i18n.auth.text.legal_terms}
              </a>
            );
          case "{privacy}":
            return (
              <a
                key={part}
                href={privacyUrl.replace("{lang}", i18n.lang)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {i18n.auth.text.legal_privacy}
              </a>
            );
          default:
            return part;
        }
      })}
    </p>
  );
};
