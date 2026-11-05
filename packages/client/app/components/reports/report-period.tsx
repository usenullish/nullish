import { useSearchParams } from "react-router";
import { isNullish, type Nullable, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { useFormatDate, useFormatDateTime } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

// An accounting or a VAT period
type Period = Pick<Api["Periods"]["Client"]["Period"], "id" | "startOn" | "endOn">;

type PeriodKey =
  | keyof Api["LedgerReports"]["Client"]["GetLedgerReportQuery"]
  | keyof Api["VatReports"]["Client"]["GenerateVatDeclarationRequest"];

export const ReportPeriodSelect = ({
  periods,
  period,
  name,
}: {
  periods: Period[];
  period: Period;
  name: PeriodKey;
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const [, setSearchParams] = useSearchParams();

  const items = periods
    .toSorted((a, b) => b.startOn.getTime() - a.startOn.getTime())
    .map(({ id, startOn, endOn }) => ({
      value: id,
      label: `${formatDate(startOn)} – ${formatDate(endOn)}`,
    }));

  return (
    <Select
      items={items}
      value={period.id}
      onValueChange={(value: Nullable<string>) =>
        setSearchParams(
          (previous) => {
            const params = new URLSearchParams(previous);

            if (isNullish(value)) {
              params.delete(name);
            } else {
              params.set(name, value);
            }

            return params;
          },
          { preventScrollReset: true },
        )
      }
    >
      <SelectTrigger aria-label={i18n.periods.label.period}>
        <span className="text-muted-foreground">{i18n.periods.label.period}:</span>
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        {items.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const ReportComputedAt = ({ computedAt }: { computedAt: Option<Date> }) => {
  const { i18n } = useI18n();
  const formatDateTime = useFormatDateTime();

  if (isNullish(computedAt)) {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground">
      {replacePlaceholders(i18n.reports.text.computed_at, {
        "{date}": formatDateTime(computedAt),
      })}
    </p>
  );
};
