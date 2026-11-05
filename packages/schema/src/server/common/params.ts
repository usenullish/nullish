import * as z from "zod";

export const RouteIdParamsSchema = z.strictObject({
  id: z.uuid(),
});

export const RouteParentIdParamsSchema = z.strictObject({
  parentId: z.uuid(),
});

export const ChildRouteIdParamsSchema = z.strictObject({
  ...RouteIdParamsSchema.shape,
  ...RouteParentIdParamsSchema.shape,
});
