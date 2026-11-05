#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as z from "zod";
import { InvoiceTemplateDataSchema } from "../src/jobs/workers/pdf-invoices/_schema";
import { mkdir } from "node:fs/promises";

const PATH_TO_OUTPUT = join(process.cwd(), "tmp", "invoices", "schema.json");

await mkdir(dirname(PATH_TO_OUTPUT), { recursive: true });

const generateSchema = () => {
  const schema = z.toJSONSchema(InvoiceTemplateDataSchema);

  writeFileSync(PATH_TO_OUTPUT, `${JSON.stringify(schema, null, 2)}\n`);
};

generateSchema();
