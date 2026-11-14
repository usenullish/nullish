import { Liquid, type LiquidOptions } from "liquidjs";

const OPTIONS: LiquidOptions = {
  outputDelimiterLeft: "[[",
  outputDelimiterRight: "]]",
  tagDelimiterLeft: "[%",
  tagDelimiterRight: "%]",
  strictVariables: true,
  lenientIf: true,
  templates: {},
};

// TODO: duplicated in the templates app for preview mode
const liquidHtml = new Liquid({ ...OPTIONS, outputEscape: "escape" });

const liquidText = new Liquid(OPTIONS);

export const renderHtmlTemplate = ({
  template,
  data,
}: {
  template: string;
  data: object;
}): Promise<string> => liquidHtml.parseAndRender(template, data);

export const renderTextTemplate = ({
  template,
  data,
}: {
  template: string;
  data: object;
}): Promise<string> => liquidText.parseAndRender(template, data);
