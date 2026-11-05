import { Fragment, useId, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  convertStringToUlps,
  isNullish,
  nonNullish,
  type Nullable,
  type Option,
  toLocalDateString,
} from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { cn } from "cn";
import { Button } from "~/ui/components/button";
import { Field, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { ToggleGroup, ToggleGroupItem } from "~/ui/components/toggle-group";
import { CurrencyCombobox } from "~/components/core/currency-combobox";
import { AccountCombobox } from "~/components/settings/accounts/combobox/account-combobox";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { EXCHANGE_RATE_DECIMALS, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { useCurrencyDecimals } from "~/kit/data/currencies.hooks";
import { useBaseAmount } from "~/kit/data/base-amount.hooks";
import { amountStep } from "~/kit/utils/amount.utils";
import { JOURNAL_POSTING_SIDES, type JournalPostingSide } from "~/context/form/_journal.form";
import { useFormatVatRate } from "~/kit/format/vat-rates.hooks";
import { defaultVatSide, isVatRateUsableOn } from "~/kit/utils/vat-rates.utils";
import { NO_SPIN_BUTTON_CLASS } from "~/kit/utils/input.utils";
import { JournalTotals } from "~/components/journal/journal-totals";
import {
  type JournalEntry,
  type JournalLinePostings,
  JournalLines,
  type Posting,
} from "~/components/journal/form/_journal-lines";

type VatRate = Api["VatRates"]["Client"]["VatRate"];

interface JournalLine {
  key: number;
  postings: JournalLinePostings;
  debitAccountId: Option<Posting["accountId"]>;
  creditAccountId: Option<Posting["accountId"]>;
  description: string;
  amount: string;
  currency: Option<string>;
  exchangeRate: string;
  vatRateId: Nullable<VatRate["id"]>;
  vatSide: JournalPostingSide;
}

const LINE_COLUMNS = "md:grid-cols-[2fr_2fr_2fr_1fr_6rem_6rem_12rem_2rem]";

const toInputAmount = ({ amount, decimals }: { amount: bigint; decimals: number }): string => {
  if (amount === 0n) {
    return "";
  }

  if (decimals === 0) {
    return `${amount}`;
  }

  const divisor = 10n ** BigInt(decimals);

  return `${amount / divisor}.${`${amount % divisor}`.padStart(decimals, "0")}`;
};

export const JournalFields = ({
  journalEntry,
  template,
  vatRates,
  vatMethods,
  periods,
}: {
  journalEntry?: JournalEntry;
  template?: JournalEntry;
  vatRates: VatRate[];
  vatMethods: Api["VatMethods"]["Client"]["VatMethod"][];
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();
  const vatRateLabel = useFormatVatRate();
  const decimalsOf = useCurrencyDecimals();
  const baseAmount = useBaseAmount();
  const accountingSettings = useAccountingSettings();
  const dateInputId = useId();
  const referenceInputId = useId();

  const baseCurrency = accountingSettings?.baseCurrency;

  const [validOn, setValidOn] = useState(() =>
    toLocalDateString(isNullish(journalEntry) ? new Date() : journalEntry.entry.validOn),
  );

  const inputAmount = ({ amount, currency }: { amount: bigint; currency: string }): string => {
    const decimals = decimalsOf(currency);
    return isNullish(decimals) ? "" : toInputAmount({ amount, decimals });
  };

  const newLine = (key: number): JournalLine => ({
    key,
    postings: {},
    debitAccountId: undefined,
    creditAccountId: undefined,
    description: "",
    amount: "",
    currency: baseCurrency,
    exchangeRate: `${EXCHANGE_RATE_ONE}`,
    vatRateId: null,
    vatSide: "debit",
  });

  const existingLine = ({
    postings,
    key,
  }: {
    postings: JournalLinePostings;
    key: number;
  }): JournalLine => {
    const { debit, credit } = postings;

    return {
      key,
      postings,
      debitAccountId: debit?.accountId,
      creditAccountId: credit?.accountId,
      description: debit?.description ?? credit?.description ?? "",
      amount: nonNullish(debit)
        ? inputAmount({ amount: debit.debit, currency: debit.currency })
        : nonNullish(credit)
          ? inputAmount({ amount: credit.credit, currency: credit.currency })
          : "",
      currency: debit?.currency ?? credit?.currency ?? baseCurrency,
      exchangeRate: `${debit?.exchangeRate ?? credit?.exchangeRate ?? EXCHANGE_RATE_ONE}`,
      vatRateId: debit?.vatRateId ?? credit?.vatRateId ?? null,
      vatSide: isNullish(debit?.vatRateId) && nonNullish(credit?.vatRateId) ? "credit" : "debit",
    };
  };

  const [lines, setLines] = useState<JournalLine[]>(() => {
    if (nonNullish(journalEntry)) {
      return JournalLines.create({ journalEntry })
        .pair()
        .map((postings, key) => existingLine({ postings, key }));
    }

    if (nonNullish(template)) {
      return JournalLines.create({ journalEntry: template })
        .pair()
        .map((postings, key) => ({
          ...existingLine({ postings, key }),
          postings: {},
        }));
    }

    return [newLine(0)];
  });

  const updateLine = ({ key, values }: { key: number; values: Partial<JournalLine> }) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...values } : line)),
    );

  const addLine = () =>
    setLines((current) => [...current, newLine(Math.max(...current.map(({ key }) => key)) + 1)]);

  const removeLine = (key: number) =>
    setLines((current) => current.filter((line) => line.key !== key));

  const inBaseCurrency = (line: JournalLine): bigint => {
    const decimals = decimalsOf(line.currency);

    if (isNullish(decimals)) {
      return 0n;
    }

    const amount = convertStringToUlps({ amount: line.amount, decimals });

    if (typeof amount !== "bigint") {
      return 0n;
    }

    return baseAmount({ amount, currency: line.currency, exchangeRate: line.exchangeRate }) ?? 0n;
  };

  const totalDebit = lines
    .filter(({ debitAccountId }) => nonNullish(debitAccountId))
    .reduce((total, line) => total + inBaseCurrency(line), 0n);
  const totalCredit = lines
    .filter(({ creditAccountId }) => nonNullish(creditAccountId))
    .reduce((total, line) => total + inBaseCurrency(line), 0n);

  const rateItems = [
    { value: null, label: i18n.journal.label.no_vat_rate },
    ...vatRates
      .filter((rate) => isVatRateUsableOn({ rate, date: validOn, vatMethods, periods }))
      .map((rate) => ({ value: rate.id, label: vatRateLabel(rate) })),
  ];

  return (
    <>
      <input type="hidden" name="rowCount" value={lines.length} />

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor={dateInputId}>{i18n.core.label.date}</FieldLabel>
          <Input
            id={dateInputId}
            name="validOn"
            type="date"
            value={validOn}
            onChange={($event) => {
              const date = $event.target.value;

              setValidOn(date);

              setLines((current) =>
                current.map((line) => {
                  const rate = vatRates.find(({ id }) => id === line.vatRateId);

                  return nonNullish(rate) && !isVatRateUsableOn({ rate, date, vatMethods, periods })
                    ? { ...line, vatRateId: null }
                    : line;
                }),
              );
            }}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={referenceInputId}>{i18n.core.label.reference}</FieldLabel>
          <Input
            id={referenceInputId}
            name="reference"
            defaultValue={(journalEntry ?? template)?.entry.reference ?? undefined}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "hidden gap-2 text-xs font-medium text-muted-foreground md:grid",
            LINE_COLUMNS,
          )}
        >
          <span>{i18n.core.label.debit}</span>
          <span>{i18n.core.label.credit}</span>
          <span>{i18n.core.label.description}</span>
          <span>{i18n.core.label.amount}</span>
          <span>{i18n.core.label.currency}</span>
          <span>{i18n.core.label.exchange_rate}</span>
          <span>{i18n.journal.label.vat_rate}</span>
          <span />
        </div>

        {lines.map((line, i) => {
          const base = line.currency === baseCurrency;
          const decimals = decimalsOf(line.currency);
          const step = amountStep(decimals);

          const vatSide: JournalPostingSide = isNullish(line.creditAccountId)
            ? "debit"
            : isNullish(line.debitAccountId)
              ? "credit"
              : line.vatSide;

          return (
            <div key={line.key} className={cn("grid grid-cols-1 gap-2", LINE_COLUMNS)}>
              {nonNullish(decimals) && (
                <input type="hidden" name={`postings[${i}].decimals`} value={decimals} />
              )}

              {JOURNAL_POSTING_SIDES.map((side) => {
                const posting = line.postings[side];

                return (
                  nonNullish(posting) && (
                    <Fragment key={side}>
                      <input type="hidden" name={`postings[${i}].${side}.id`} value={posting.id} />
                      <input
                        type="hidden"
                        name={`postings[${i}].${side}.version`}
                        value={posting.version}
                      />
                    </Fragment>
                  )
                );
              })}

              {JOURNAL_POSTING_SIDES.map((side) => (
                <input
                  key={side}
                  type="hidden"
                  name={`postings[${i}].${side}.vatRateId`}
                  value={vatSide === side ? (line.vatRateId ?? "") : ""}
                />
              ))}

              <AccountCombobox
                id={`${dateInputId}-debit-account-${line.key}`}
                name={`postings[${i}].debit.accountId`}
                defaultAccountId={line.debitAccountId}
                onAccountChange={(debitAccountId) =>
                  updateLine({ key: line.key, values: { debitAccountId } })
                }
                required={isNullish(line.creditAccountId)}
                postableOnly
              />

              <AccountCombobox
                id={`${dateInputId}-credit-account-${line.key}`}
                name={`postings[${i}].credit.accountId`}
                defaultAccountId={line.creditAccountId}
                onAccountChange={(creditAccountId) =>
                  updateLine({ key: line.key, values: { creditAccountId } })
                }
                required={isNullish(line.debitAccountId)}
                postableOnly
              />

              <Input
                name={`postings[${i}].description`}
                aria-label={i18n.core.label.description}
                value={line.description}
                onChange={($event) =>
                  updateLine({
                    key: line.key,
                    values: { description: $event.target.value },
                  })
                }
              />

              <Input
                name={`postings[${i}].amount`}
                type="number"
                step={step}
                min="0"
                value={line.amount}
                onChange={($event) =>
                  updateLine({
                    key: line.key,
                    values: { amount: $event.target.value },
                  })
                }
                aria-label={i18n.core.label.amount}
                required
              />

              <CurrencyCombobox
                name={`postings[${i}].currency`}
                value={line.currency}
                onValueChange={(currency) =>
                  updateLine({
                    key: line.key,
                    values: {
                      currency: currency ?? baseCurrency,
                      exchangeRate: `${EXCHANGE_RATE_ONE}`,
                    },
                  })
                }
              />

              {base && <input type="hidden" name={`postings[${i}].exchangeRate`} value="1" />}

              <Input
                name={base ? undefined : `postings[${i}].exchangeRate`}
                type="number"
                step={10 ** -EXCHANGE_RATE_DECIMALS}
                min="0"
                className={NO_SPIN_BUTTON_CLASS}
                value={base ? "1" : line.exchangeRate}
                disabled={base}
                onChange={($event) =>
                  updateLine({
                    key: line.key,
                    values: { exchangeRate: $event.target.value },
                  })
                }
                aria-label={i18n.core.label.exchange_rate}
                required
              />

              <div className="flex items-center gap-1">
                <Select
                  items={rateItems}
                  value={line.vatRateId}
                  onValueChange={(vatRateId: Nullable<VatRate["id"]>) =>
                    updateLine({
                      key: line.key,
                      values: {
                        vatRateId,
                        vatSide: defaultVatSide({
                          rate: vatRates.find(({ id }) => id === vatRateId),
                        }),
                      },
                    })
                  }
                >
                  <SelectTrigger
                    className={cn(
                      "transition-[width,background-color,border-color,color] duration-200",
                      nonNullish(line.vatRateId) ? "w-20 shrink-0" : "w-full",
                    )}
                    aria-label={i18n.journal.label.vat_rate}
                  >
                    <SelectValue>
                      {(value: Nullable<VatRate["id"]>) =>
                        vatRates.find(({ id }) => id === value)?.code
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" className="w-auto">
                    {rateItems.map(({ value, label }) => (
                      <SelectItem key={value ?? ""} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {nonNullish(line.vatRateId) && (
                  <ToggleGroup
                    value={[vatSide]}
                    onValueChange={(sides) => {
                      const [vatSide] = sides;

                      if (nonNullish(vatSide)) {
                        updateLine({ key: line.key, values: { vatSide } });
                      }
                    }}
                    aria-label={i18n.journal.label.vat_side}
                    className="flex-1 animate-in duration-200 fade-in slide-in-from-right-2"
                  >
                    {JOURNAL_POSTING_SIDES.map((side) => (
                      <ToggleGroupItem
                        key={side}
                        value={side}
                        disabled={isNullish(
                          side === "debit" ? line.debitAccountId : line.creditAccountId,
                        )}
                      >
                        {i18n.core.label[side]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              </div>

              {lines.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={i18n.journal.action.remove_line}
                  onClick={() => removeLine(line.key)}
                >
                  <X />
                </Button>
              ) : (
                <span />
              )}
            </div>
          );
        })}

        <div>
          <Button type="button" variant="outline" onClick={addLine}>
            <Plus />
            {i18n.journal.action.add_line}
          </Button>
        </div>

        {nonNullish(baseCurrency) && (
          <JournalTotals
            totalDebit={totalDebit}
            totalCredit={totalCredit}
            baseCurrency={baseCurrency}
          />
        )}
      </div>
    </>
  );
};
