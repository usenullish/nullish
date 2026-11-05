import { formatIban, isNullish, nonNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Amount } from "~/components/core/amount";
import { MovementStatusBadge } from "~/components/banking/movements/movement-status-badge";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

export const MovementDetails = ({
  movement,
}: {
  movement: Api["BankMovements"]["Client"]["BankMovement"];
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();

  const rows = [
    {
      label:
        movement.amount > 0n
          ? i18n.bank_movements.label.sender
          : i18n.bank_movements.label.recipient,
      value:
        isNullish(movement.counterpartyName) && isNullish(movement.counterpartyAddress) ? null : (
          <>
            {movement.counterpartyName}
            {nonNullish(movement.counterpartyAddress) && (
              <span className="block">{movement.counterpartyAddress}</span>
            )}
          </>
        ),
    },
    {
      label: i18n.bank_relations.label.iban,
      value: isNullish(movement.counterpartyIban) ? null : formatIban(movement.counterpartyIban),
    },
    { label: i18n.bank_movements.label.booked_on, value: formatDate(movement.bookedOn) },
    {
      label: i18n.bank_movements.label.value_on,
      value: isNullish(movement.valueOn) ? null : formatDate(movement.valueOn),
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
    { label: i18n.bank_movements.label.reference, value: movement.creditorReference },
    { label: i18n.bank_movements.label.communication, value: movement.communication },
    { label: i18n.bank_movements.label.description, value: movement.description },
    { label: i18n.bank_movements.label.bank_reference, value: movement.bankReference },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xs font-medium tabular-nums">
          <Amount amount={movement.amount} currencyCode={movement.currency} />
        </h1>
        <MovementStatusBadge status={movement.status} />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        {rows
          .filter(({ value }) => nonNullish(value))
          .map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
};
