import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Search, X } from "lucide-react";
import { isEmptyString, type Nullable, type Option } from "@usenullish/nullish-common";
import { CommonSchema } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "~/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { useI18n } from "~/kit/i18n/i18n.context";

const OFFSET_KEY = "offset" as const;

// The offset is not kept so that filtering restarts from the first page
const KEPT_PARAMS: readonly string[] = CommonSchema.Query.ListQueryParamsSchema.keyof().exclude([
  OFFSET_KEY,
]).options;

const SEARCH_DEBOUNCE_MS = 300;

export interface FilterOption {
  value: string;
  label: string;
}

const useFilterParam = ({ name }: { name: string }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = searchParams.get(name) ?? "";

  const setValue = (next: string) =>
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);

        if (isEmptyString(next)) {
          params.delete(name);
        } else {
          params.set(name, next);
        }

        params.delete(OFFSET_KEY);

        return params;
      },
      { preventScrollReset: true },
    );

  return [value, setValue] as const;
};

export const ListFilters = ({
  children,
  keep = [],
}: {
  children: ReactNode;
  keep?: readonly string[];
}) => {
  const { i18n } = useI18n();
  const [searchParams] = useSearchParams();

  const keptParams = [...KEPT_PARAMS, ...keep];

  const kept = new URLSearchParams([...searchParams].filter(([key]) => keptParams.includes(key)));

  const filtered = [...searchParams.keys()].some(
    (key) => key !== OFFSET_KEY && !keptParams.includes(key),
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}

      {filtered && (
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link to={`?${kept}`} preventScrollReset />}
        >
          <X />
          {i18n.core.action.clear}
        </Button>
      )}
    </div>
  );
};

export const FilterText = ({
  name,
  label,
  numeric = false,
}: {
  name: string;
  label: string;
  numeric?: boolean;
}) => {
  const [param, setParam] = useFilterParam({ name });

  const [value, setValue] = useState(param);
  const [syncedParam, setSyncedParam] = useState(param);

  const timeout = useRef<Option<ReturnType<typeof setTimeout>>>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  if (param !== syncedParam) {
    setSyncedParam(param);
    setValue(param);
  }

  const onChange = (input: string) => {
    const next = numeric ? input.replace(/\D/g, "") : input;

    setValue(next);

    clearTimeout(timeout.current);
    timeout.current = setTimeout(
      () => setParam(isEmptyString(next.trim()) ? "" : next),
      SEARCH_DEBOUNCE_MS,
    );
  };

  return (
    <InputGroup className="w-56">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        inputMode={numeric ? "numeric" : undefined}
        className="[&::-webkit-search-cancel-button]:appearance-none"
        value={value}
        onChange={($event) => onChange($event.target.value)}
        placeholder={label}
        aria-label={label}
      />
    </InputGroup>
  );
};

export const FilterDate = ({ name, label }: { name: string; label: string }) => {
  const [param, setParam] = useFilterParam({ name });

  return (
    <InputGroup className="w-fit">
      <InputGroupAddon>
        <InputGroupText>{label}</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        key={param}
        type="date"
        defaultValue={param}
        onChange={({ target: { value } }) => {
          if (value !== param) {
            setParam(value);
          }
        }}
        aria-label={label}
      />
    </InputGroup>
  );
};

export const FilterSelect = ({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: readonly FilterOption[];
}) => {
  const { i18n } = useI18n();
  const [param, setParam] = useFilterParam({ name });

  const items = [{ value: null, label: i18n.core.label.all }, ...options];

  return (
    <Select
      items={items}
      value={param === "" ? null : param}
      onValueChange={(value: Nullable<string>) => setParam(value ?? "")}
    >
      <SelectTrigger aria-label={label}>
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>

      <SelectContent align="start" className="w-auto">
        {items.map(({ value, label }) => (
          <SelectItem key={value ?? ""} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
