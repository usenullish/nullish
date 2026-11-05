import { useSearchParams } from "react-router";
import { CommonSchema } from "@usenullish/nullish-schema/server";

const ListQueryParamsSchema = CommonSchema.Query.ListQueryParamsSchema.partial();

export const useListQueryParams = () => {
  const [searchParams] = useSearchParams();

  const { data } = ListQueryParamsSchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    direction: searchParams.get("direction") ?? undefined,
  });

  return data ?? {};
};
