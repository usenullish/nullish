import { useEffect, useState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { FieldDescription, FieldSet } from "~/ui/components/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { useLlmUsage } from "~/context/contexts/llm-usage.context";
import { UserReportsService } from "~/lib/services/user+reports.services";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useLocale } from "~/kit/locale/locale.hooks";
import { useFormatNumber } from "~/kit/format/number.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useNotify } from "~/kit/notifications/notify.hook";

type LlmUsage = Api["LlmUsage"]["Client"]["GetLlmUsageResponse"]["llmUsage"];

export const ProfileUsage = () => {
  const { i18n } = useI18n();
  const { notifyError } = useNotify();
  const formatDate = useFormatDate();
  const locale = useLocale();
  const formatNumber = useFormatNumber();
  const initialUsage = useLlmUsage();

  const [usage, setUsage] = useState<LlmUsage>(initialUsage ?? []);

  useEffect(() => {
    const reload = async () => {
      const result = await UserReportsService.create().reloadLlmUsage();

      if (result.status === "error") {
        notifyError({ msg: i18n.usage.toast.load_error, detail: result.err });
        return;
      }

      setUsage(result.result.llmUsage);
    };

    void reload();
  }, [i18n, notifyError]);

  const now = new Date();
  const month = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(now);
  const resetOn = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return (
    <FieldSet>
      <FieldDescription>
        {replacePlaceholders(i18n.usage.text.period, {
          "{month}": month,
          "{date}": formatDate(resetOn),
        })}
      </FieldDescription>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{i18n.usage.label.model}</TableHead>
            <TableHead className="text-right">{i18n.usage.label.input_tokens}</TableHead>
            <TableHead className="text-right">{i18n.usage.label.output_tokens}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {usage.map(({ model, inputTokens, outputTokens }) => (
            <TableRow key={model}>
              <TableCell className="font-mono">{model}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber({ value: inputTokens })}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber({ value: outputTokens })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </FieldSet>
  );
};
