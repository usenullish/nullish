import { startTransition, useEffect, useState, ViewTransition } from "react";
import { useNavigate, useRevalidator, useSearchParams } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { isNullish, nonNullish } from "@usenullish/nullish-common";
import { useOrganization } from "~/context/contexts/organization.context";
import { useListQueryParams } from "~/context/hooks/list-query.hooks";
import { MovementInvoiceCard } from "~/components/banking/reconcile/movement-invoice-card";
import { MovementAccountCard } from "~/components/banking/reconcile/movement-account-card";
import { BankingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

type BankMovementSummary = Api["BankMovementSummaries"]["Client"]["BankMovementSummary"];
type VatRate = Api["VatRates"]["Client"]["VatRate"];
type VatMethod = Api["VatMethods"]["Client"]["VatMethod"];
type Period = Api["Periods"]["Client"]["Period"];
type BankMovementId = BankMovementSummary["movement"]["id"];

type WithSuggestedInvoice = BankMovementSummary & {
  suggestedInvoice: NonNullable<BankMovementSummary["suggestedInvoice"]>;
};

export const ReconcileMovements = ({
  bankRelation,
  bankMovementSummaries,
  vatRates,
  vatMethods,
  periods,
}: {
  bankRelation: Api["BankRelations"]["Client"]["BankRelation"];
  bankMovementSummaries: BankMovementSummary[];
  vatRates: VatRate[];
  vatMethods: VatMethod[];
  periods: Period[];
}) => {
  const { i18n } = useI18n();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const [searchParams] = useSearchParams();
  const { offset = 0 } = useListQueryParams();
  const organization = useOrganization();

  const [doneIds, setDoneIds] = useState<Set<BankMovementId>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<BankMovementId>>(new Set());

  const remaining = bankMovementSummaries.filter(({ movement }) => !doneIds.has(movement.id));

  const withSuggestedInvoice = remaining.filter(
    (summary): summary is WithSuggestedInvoice =>
      nonNullish(summary.suggestedInvoice) && !rejectedIds.has(summary.movement.id),
  );

  const toBookOnAccount = remaining.filter(
    ({ movement, suggestedInvoice }) => isNullish(suggestedInvoice) || rejectedIds.has(movement.id),
  );

  const movementsPath = BankingPath.create({ organizationId: organization.id }).to({
    path: `/${bankRelation.id}?status=unreconciled`,
  });

  const pageEmptied = doneIds.size > 0 && bankMovementSummaries.length === 0;

  useEffect(() => {
    if (!pageEmptied) {
      return;
    }

    if (offset > 0) {
      const params = new URLSearchParams(searchParams);
      params.delete("offset");
      void navigate(`?${params}`, { replace: true });
      return;
    }

    void navigate(movementsPath);
  }, [pageEmptied, offset, searchParams, movementsPath, navigate]);

  const markDone = (movementId: BankMovementId) => {
    startTransition(() => setDoneIds((ids) => new Set([...ids, movementId])));
    void revalidate();
  };

  const rejectSuggestion = (movementId: BankMovementId) =>
    startTransition(() => setRejectedIds((ids) => new Set([...ids, movementId])));

  if (pageEmptied) {
    return null;
  }

  if (bankMovementSummaries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {i18n.bank_movements.text.nothing_to_reconcile}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {withSuggestedInvoice.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-medium">{i18n.bank_movements.text.matched_title}</h2>

          {withSuggestedInvoice.map(({ movement, suggestedInvoice }) => (
            <ViewTransition key={movement.id} name={`movement-${movement.id}`}>
              <MovementInvoiceCard
                movement={movement}
                invoiceSummary={suggestedInvoice}
                onDone={markDone}
                onRejectSuggestion={rejectSuggestion}
              />
            </ViewTransition>
          ))}
        </section>
      )}

      {toBookOnAccount.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-medium">{i18n.bank_movements.text.account_title}</h2>

          {toBookOnAccount.map(({ movement }) => (
            <ViewTransition key={movement.id} name={`movement-${movement.id}`}>
              <MovementAccountCard
                movement={movement}
                bankRelation={bankRelation}
                vatRates={vatRates}
                vatMethods={vatMethods}
                periods={periods}
                onDone={markDone}
              />
            </ViewTransition>
          ))}
        </section>
      )}
    </div>
  );
};
