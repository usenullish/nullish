import { Link, useSearchParams } from "react-router";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "~/ui/components/table";
import { useListQueryParams } from "~/context/hooks/list-query.hooks";

export const SortableHeader = ({ field, label }: { field: string; label: string }) => {
  const [searchParams] = useSearchParams();
  const { sort, direction } = useListQueryParams();

  const active = sort === field;

  const params = new URLSearchParams(searchParams);
  params.set("sort", field);
  params.set("direction", active && direction === "asc" ? "desc" : "asc");
  params.delete("offset");

  return (
    <TableHead aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}>
      <Link
        to={`?${params}`}
        preventScrollReset
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 text-muted-foreground" />
        )}
      </Link>
    </TableHead>
  );
};
