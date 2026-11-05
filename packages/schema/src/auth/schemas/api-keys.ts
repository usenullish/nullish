import * as z from "zod";
import { ApiKeyAction, ApiKeyResource } from "../constants/api-keys";

export const ApiKeyPermissionsSchema = z.partialRecord(
  z.enum(ApiKeyResource),
  z
    .array(z.enum(ApiKeyAction))
    .nonempty()
    .refine(
      (actions) => !actions.includes(ApiKeyAction.WRITE) || actions.includes(ApiKeyAction.READ),
      {
        message: "The write permission requires the read permission",
      },
    ),
);
