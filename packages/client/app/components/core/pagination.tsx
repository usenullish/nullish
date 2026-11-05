import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isNullish, type Option } from "@usenullish/nullish-common";
import { QUERY_DEFAULT_PAGINATION } from "@usenullish/nullish-schema/db";
import { Button } from "~/ui/components/button";
import { useListQueryParams } from "~/context/hooks/list-query.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

const PageButton = ({
  to,
  label,
  children,
}: {
  to: Option<string>;
  label: string;
  children: ReactNode;
}) =>
  isNullish(to) ? (
    <Button variant="outline" size="icon-sm" aria-label={label} disabled>
      {children}
    </Button>
  ) : (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={label}
      nativeButton={false}
      render={<Link to={to} preventScrollReset />}
    >
      {children}
    </Button>
  );

export const Pagination = ({ count }: { count: number }) => {
  const { i18n } = useI18n();
  const [searchParams] = useSearchParams();
  const { limit = QUERY_DEFAULT_PAGINATION, offset = 0 } = useListQueryParams();

  const toOffset = (target: number): string => {
    const params = new URLSearchParams(searchParams);
    params.set("offset", `${target}`);
    return `?${params}`;
  };

  const range = count === 0 ? "0" : `${offset + 1}–${offset + count}`;

  return (
    <nav className="flex items-center justify-end gap-2">
      <span className="text-xs text-muted-foreground tabular-nums">{range}</span>

      <PageButton
        to={offset > 0 ? toOffset(Math.max(offset - limit, 0)) : undefined}
        label={i18n.core.action.previous}
      >
        <ChevronLeft />
      </PageButton>

      <PageButton
        to={count === limit ? toOffset(offset + limit) : undefined}
        label={i18n.core.action.next}
      >
        <ChevronRight />
      </PageButton>
    </nav>
  );
};
