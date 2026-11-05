import { CommonSchema } from "@usenullish/nullish-schema/server";

export interface RouteArgs {
  path: `/${string}`;
  spec: {
    tag: string;
  };
}

export const buildRouteErrorResponses = ({ spec: { tag } }: Pick<RouteArgs, "spec">) => ({
  400: {
    content: {
      "application/json": {
        schema: CommonSchema.Error.ErrorSchema,
      },
    },
    description: "Bad Request",
  },
  401: {
    content: {
      "application/json": {
        schema: CommonSchema.Error.ErrorSchema,
      },
    },
    description: "Unauthorized",
  },
  409: {
    content: {
      "application/json": {
        schema: CommonSchema.Error.ErrorSchema,
      },
    },
    description: "Conflict",
  },
  422: {
    content: {
      "application/json": {
        schema: CommonSchema.Error.ErrorSchema,
      },
    },
    description: "Unprocessable Content",
  },
  429: {
    content: {
      "application/json": {
        schema: CommonSchema.Error.ErrorSchema,
      },
    },
    description: "Too Many Requests",
  },
  500: {
    content: {
      "application/json": {
        schema: CommonSchema.Error.ErrorSchema,
      },
    },
    description: `Internal server error for ${tag.toLowerCase()}`,
  },
});
