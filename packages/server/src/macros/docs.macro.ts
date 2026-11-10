import { Glob } from "bun";
import { join } from "node:path";
import * as z from "zod";
import { RecordsSchema } from "@usenullish/nullish-schema/records";

const DOCS_DIR = join(import.meta.dir, "../../../../docs");

const FRONTMATTER_REGEX = /^---\n(?<frontmatter>[\s\S]*?)\n---\n(?<content>[\s\S]*)$/;

const LanguageSchema =
  RecordsSchema.Core.DocumentsSchema.InsertTemplateContentsSchema.shape.language;

const FrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
});

interface DocsPage {
  language: string;
  slug: string;
  title: string;
  description: string;
  content: string;
}

const loadPage = async (path: string): Promise<DocsPage> => {
  const text = await Bun.file(join(DOCS_DIR, path)).text();

  const match = FRONTMATTER_REGEX.exec(text);

  if (match?.groups === undefined) {
    throw new Error(`The docs page ${path} has no frontmatter.`);
  }

  const { frontmatter, content } = match.groups;

  const { title, description } = FrontmatterSchema.parse(Bun.YAML.parse(frontmatter ?? ""));

  const [folder, ...segments] = path.split("/");

  if (segments.length === 0) {
    throw new Error(`The docs page ${path} is not in a language folder.`);
  }

  return {
    language: LanguageSchema.parse(folder),
    slug: segments
      .join("/")
      .replace(/\.mdoc$/, "")
      .replace(/(^|\/)index$/, ""),
    title,
    description,
    content: (content ?? "").trim(),
  };
};

// Bun macro: runs at build time, the pages are bundled.
// import { bundleDocs } from "./_docs.macro" with { type: "macro" };
export const bundleDocs = async (): Promise<Partial<Record<string, DocsPage[]>>> => {
  const paths = [...new Glob("**/*.mdoc").scanSync(DOCS_DIR)].toSorted();
  const pages = await Promise.all(paths.map(loadPage));
  return Object.groupBy(pages, ({ language }) => language);
};
