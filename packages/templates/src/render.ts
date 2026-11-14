import { Liquid } from "liquidjs";

// TODO: duplicated in the templates app for preview mode
const liquid = new Liquid({
  outputDelimiterLeft: "[[",
  outputDelimiterRight: "]]",
  tagDelimiterLeft: "[%",
  tagDelimiterRight: "%]",
  outputEscape: "escape",
  strictVariables: true,
  lenientIf: true,
  templates: {},
});

export const renderTemplate = ({
  template,
  data,
}: {
  template: string;
  data: object;
}): Promise<string> => liquid.parseAndRender(template, data);
