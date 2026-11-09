import * as z from "zod";
import type { LoaderFunctionArgs } from "react-router";
import { isNullish, notEmptyString, type Nullable } from "@usenullish/nullish-common";

const MetadataSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  image: z.string().optional(),
});

export type Metadata = z.infer<typeof MetadataSchema>;

const IMAGE_PATH = "/social-image.jpg";

export const DEFAULT_METADATA: Metadata = {
  title: "nullish",
  description: "Open-source Swiss accounting you can self-host. Al ready.",
};

// We need the origin to render absolute URLs in the meta tags (e.g. the social image) without hardcoding the domain.
// The request reaches the client over http because the proxy handles the https, that's why we use X-Forwarded-Proto.
// This works with Caddy, which keeps the Host and sets X-Forwarded-Proto by default, but it might not work with other
// proxies, e.g. nginx rewrites the Host unless configured otherwise.
const initOrigin = ({ request }: LoaderFunctionArgs): Nullable<string> => {
  const url = URL.parse(request.url);

  if (isNullish(url)) {
    return null;
  }

  const ForwardedProtoSchema = z.enum(["http", "https"]);

  const { success, data } = ForwardedProtoSchema.safeParse(
    request.headers.get("X-Forwarded-Proto"),
  );

  if (success) {
    url.protocol = data;
  }

  return url.origin;
};

export const initMetadata = (args: LoaderFunctionArgs): Metadata => {
  const origin = initOrigin(args);

  return {
    ...DEFAULT_METADATA,
    ...(notEmptyString(origin) && {
      image: `${origin}${IMAGE_PATH}`,
    }),
  };
};
