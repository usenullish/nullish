#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as z from "zod";

const PATH_FROM_ROOT = join(process.cwd(), "app");
const PATH_TO_EN_JSON = join(PATH_FROM_ROOT, "assets", "i18n", "en.json");
const PATH_TO_OUTPUT = join(PATH_FROM_ROOT, "kit", "i18n", "i18n.ts");

type I18nValues = { [key: string]: string | I18nValues };

const I18nValuesSchema: z.ZodType<I18nValues> = z.record(
  z.string(),
  z.union([z.string(), z.lazy(() => I18nValuesSchema)]),
);

const I18nSchema = z.record(z.string(), I18nValuesSchema);

/**
 * Generates TypeScript interfaces from the English translation file.
 */
const generateTypes = async () => {
  const { default: json } = await import(PATH_TO_EN_JSON, { with: { type: "json" } });

  const en = I18nSchema.parse(json);

  const mapValues = (values: I18nValues): string[] =>
    Object.entries(values).reduce<string[]>(
      (acc, [key, value]) => [
        ...acc,
        `${key}: ${typeof value === "object" ? `z.strictObject({${mapValues(value).join("")}})` : "z.string()"},`,
      ],
      [],
    );

  const data = Object.entries(en).map(([key, values]) => ({
    key,
    name: `I18n${key.charAt(0).toUpperCase()}${key.slice(1)}Schema`,
    values: mapValues(values),
  }));

  const main = `\n\nexport const I18nSchema = z.strictObject({${data.map(({ key, name }) => `${key}: ${name},`).join("")}});`;
  const interfaces = data
    .map(({ name, values }) => `\n\nconst ${name} = z.strictObject({${values.join("")}})`)
    .join("");

  const infer = `\n\nexport type I18n = z.infer<typeof I18nSchema>;`;

  const comment = `/**\n* Auto-generated definitions file ("bun i18n")\n*/\nimport * as z from "zod";`;

  writeFileSync(PATH_TO_OUTPUT, `${comment}${interfaces}${main}${infer}`);
};

await generateTypes();
