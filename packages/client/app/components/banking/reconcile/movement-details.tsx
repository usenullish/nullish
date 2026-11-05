import { formatIban, isNullish, nonNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Amount } from "~/components/core/amount";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

export const MovementDetails = ({
  movement,
}: {
  movement: Api["BankMovements"]["Client"]["BankMovement"];
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();

  const heading = movement.description ?? movement.communication;

  const counterparty = [movement.counterpartyName, movement.counterpartyAddress].filter(nonNullish);

  const rows = [
    {
      label: i18n.bank_movements.label.booked_on,
      value: formatDate(movement.bookedOn),
    },
    {
      label: i18n.bank_movements.label.value_on,
      value: isNullish(movement.valueOn) ? null : formatDate(movement.valueOn),
    },
    {
      label: i18n.bank_movements.label.amount,
      value: <Amount amount={movement.amount} currencyCode={movement.currency} />,
    },
    {
      label: i18n.bank_movements.label.original_amount,
      value:
        isNullish(movement.foreignAmount) || isNullish(movement.foreignCurrency) ? null : (
          <Amount amount={movement.foreignAmount} currencyCode={movement.foreignCurrency} />
        ),
    },
    {
      label: i18n.bank_movements.label.bank_fees,
      value:
        isNullish(movement.bankFeesAmount) || isNullish(movement.bankFeesCurrency) ? null : (
          <Amount amount={movement.bankFeesAmount} currencyCode={movement.bankFeesCurrency} />
        ),
    },
    {
      label: i18n.bank_relations.label.iban,
      value: isNullish(movement.counterpartyIban) ? null : formatIban(movement.counterpartyIban),
    },
    {
      label:
        movement.amount > 0n
          ? i18n.bank_movements.label.payment_from
          : i18n.bank_movements.label.payment_to,
      value:
        counterparty.length === 0
          ? null
          : counterparty.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            )),
    },
    {
      label: i18n.bank_movements.label.reference,
      value: movement.creditorReference,
    },
    {
      label: i18n.bank_movements.label.communication,
      value: isNullish(movement.description) ? null : movement.communication,
    },
    {
      label: i18n.bank_movements.label.bank_reference,
      value: movement.bankReference,
    },
  ].filter(({ value }) => nonNullish(value));

  return (
    <div className="flex flex-col gap-2">
      {nonNullish(heading) && <span className="text-xs font-medium">{heading}</span>}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        {rows.map(({ label, value }) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-all tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
