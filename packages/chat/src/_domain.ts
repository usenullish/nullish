import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";
import { ChatTool } from "./_tools";
import { isNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { CREATE_ORGANIZATION_TOOL, ORGANIZATION_ID_ARG } from "./_constants";

type ChatDomain = Api["Chat"]["Client"]["ChatDomain"];

// The organization is set by the chat on each call, so the model never has to pass it and cannot
// pass another one - in other word: this is for the model. Without it, every organization tool would
// show an organizationId argument marked as required. The model would then have to fill in a value it doesn't need.
const omitOrganizationId = ({ tool }: { tool: ChatTool }): ChatTool => {
  const { parameters } = tool;

  if (isNullish(parameters?.properties) || !(ORGANIZATION_ID_ARG in parameters.properties)) {
    return tool;
  }

  const { [ORGANIZATION_ID_ARG]: _, ...otherProperties } = parameters.properties;

  const restrictedTool: ChatCompletionFunctionTool = {
    ...tool.definition,
    function: {
      ...tool.definition.function,
      parameters: {
        ...parameters,
        properties: otherProperties,
        required: parameters.required?.filter((key) => key !== ORGANIZATION_ID_ARG),
      },
    },
  };

  return ChatTool.create({ definition: restrictedTool, annotations: tool.annotations });
};

export const domainTools = ({
  tools,
  domain,
}: {
  tools: ChatTool[];
  domain: ChatDomain;
}): ChatTool[] => {
  const chatTools = tools.filter(({ name }) => name !== CREATE_ORGANIZATION_TOOL);

  // Without an organization, nothing injects the organizationId: the model passes it itself
  if (domain.type === "unscoped") {
    return chatTools;
  }

  return chatTools.map((tool) => omitOrganizationId({ tool }));
};

export const domainArgs = ({
  tool,
  domain,
}: {
  tool: ChatTool;
  domain: ChatDomain;
}): Record<string, unknown> =>
  domain.type === "organization" && tool.takesOrganizationId
    ? { [ORGANIZATION_ID_ARG]: domain.organizationId }
    : {};
