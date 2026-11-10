import * as z from "zod";
import { RecordsSchema } from "@usenullish/nullish-schema/records";
import { bundleDocs } from "../../macros/docs.macro" with { type: "macro" };
import { READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

const DOCS = await bundleDocs();

const DEFAULT_LANGUAGE = "en";

const LanguageSchema =
  RecordsSchema.Core.DocumentsSchema.InsertTemplateContentsSchema.shape.language;

const DocsPageSummarySchema = z.strictObject({
  language: LanguageSchema,
  slug: z.string(),
  title: z.string(),
  description: z.string(),
});

const DocsPageSchema = DocsPageSummarySchema.extend({
  content: z.string(),
});

type DocsPage = z.infer<typeof DocsPageSchema>;

export class McpToolsDocs extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsDocs {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListDocs();
    this.#registerGetDocsPage();
  }

  override registerWriteTools() {}

  #registerListDocs() {
    this.registerTool({
      title: "list_docs",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the pages of the user documentation of the application in a language, each with its slug, title and description. Falls back to English when the documentation is not available in the language.",
      inputSchema: z.strictObject({
        language: LanguageSchema.optional(),
      }),
      outputSchema: z.strictObject({ pages: z.array(DocsPageSummarySchema) }),
      fn: async ({ language }) => ({
        status: "success",
        result: {
          pages: this.#pages({ language }).map(({ content: _, ...summary }) => summary),
        },
      }),
    });
  }

  #registerGetDocsPage() {
    this.registerTool({
      title: "get_docs_page",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns a page of the user documentation by its slug, as listed by list_docs, with its content in Markdoc. Falls back to English when the documentation is not available in the language.",
      inputSchema: z.strictObject({
        slug: DocsPageSchema.shape.slug,
        language: LanguageSchema.optional(),
      }),
      outputSchema: z.strictObject({ page: DocsPageSchema.optional() }),
      fn: async ({ slug, language }) => ({
        status: "success",
        result: {
          page: this.#pages({ language }).find((page) => page.slug === slug),
        },
      }),
    });
  }

  #pages({ language = DEFAULT_LANGUAGE }: Partial<Pick<DocsPage, "language">>): DocsPage[] {
    return DOCS[language] ?? DOCS[DEFAULT_LANGUAGE] ?? [];
  }
}
