import type { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import de from "../documents/pdf-invoices/de.html" with { type: "text" };
import en from "../documents/pdf-invoices/en.html" with { type: "text" };
import fr from "../documents/pdf-invoices/fr.html" with { type: "text" };
import it from "../documents/pdf-invoices/it.html" with { type: "text" };

export const DEFAULT_TEMPLATES = { de, en, fr, it } as unknown as Record<
  DefaultTemplateLanguage,
  string
>;
