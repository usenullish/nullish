import type { Api } from "@usenullish/nullish-schema/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { Amount } from "~/components/core/amount";
import { SortableHeader } from "~/components/core/sortable-header";
import { MovementStatusBadge } from "~/components/banking/movements/movement-status-badge";
import { MovementActions } from "~/components/banking/movements/movement-actions";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

export const MovementsTable = ({
  bankMovements,
}: {
  bankMovements: Api["BankMovements"]["Client"]["BankMovement"][];
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="bookedOn" label={i18n.bank_movements.label.booked_on} />
          <TableHead className="text-right">{i18n.bank_movements.label.amount}</TableHead>
          <TableHead>{i18n.bank_movements.label.counterparty}</TableHead>
          <TableHead>{i18n.bank_movements.label.communication}</TableHead>
          <TableHead>{i18n.bank_movements.label.reference}</TableHead>
          <TableHead>{i18n.core.label.status}</TableHead>
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {bankMovements.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-muted-foreground">
              {i18n.bank_movements.text.empty}
            </TableCell>
          </TableRow>
        ) : (
          bankMovements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell>{formatDate(movement.bookedOn)}</TableCell>
              <TableCell className="text-right tabular-nums">
                <Amount amount={movement.amount} currencyCode={movement.currency} />
              </TableCell>
              <TableCell className="whitespace-normal">{movement.counterpartyName}</TableCell>
              <TableCell className="whitespace-normal">
                {movement.communication ?? movement.description}
              </TableCell>
              <TableCell className="tabular-nums">{movement.creditorReference}</TableCell>
              <TableCell>
                <MovementStatusBadge status={movement.status} />
              </TableCell>
              <TableCell className="w-px">
                <MovementActions movement={movement} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
