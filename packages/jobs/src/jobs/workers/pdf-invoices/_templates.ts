import type { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import de from "../../../../templates/pdf-invoices/de.html" with { type: "text" };
import en from "../../../../templates/pdf-invoices/en.html" with { type: "text" };
import fr from "../../../../templates/pdf-invoices/fr.html" with { type: "text" };
import it from "../../../../templates/pdf-invoices/it.html" with { type: "text" };

export const DEFAULT_TEMPLATES = { de, en, fr, it } as unknown as Record<
  DefaultTemplateLanguage,
  string
>;
