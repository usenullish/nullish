export const ORGANIZATION_ID_ARG = "organizationId";

// Upper bound of model calls for one answer, so that a model looping on tool calls cannot run forever
export const MAX_ROUNDS = 8;

// Upper bound of the duration of one chat request, as worst case for the rounds of an answer
export const MAX_CHAT_DURATION_SECONDS = 300;

// Upper bound of tokens the model can generate per call, so that a single answer cannot run away.
// 2000 tokens is about 1500 words, e.g. a table of 50 invoices: far above a typical answer or the
// arguments of a tool call, while bounding the output of one answer to MAX_ROUNDS × 2000 tokens.
export const MAX_OUTPUT_TOKENS = 2000;

// An organization should not be created within an existing organization. That's why we filter out the related tool.
export const CREATE_ORGANIZATION_TOOL = "create_organization";

export const MAX_HISTORY_TOOL_RESULT_LENGTH = 4000;
