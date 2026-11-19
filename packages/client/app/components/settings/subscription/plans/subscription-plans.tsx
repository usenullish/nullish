import { startTransition, useState, ViewTransition } from "react";
import { isEmptyString, nonNullish, type Nullable, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { PaymentsCheckoutService } from "~/lib/services/payments+checkout.services";
import { useOrganization } from "~/context/contexts/organization.context";
import { useCurrencies } from "~/context/contexts/currencies.context";
import { useIsOrganizationAdmin } from "~/context/hooks/memberships.hooks";
import { errorReason } from "~/kit/error-drawer/errors.utils";
import { useFormatAmount } from "~/kit/format/amount.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { Button } from "~/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/ui/components/card";

type Plan = Api["PaymentsPlans"]["Client"]["Plan"];
type PlanPrice = Api["PaymentsPlans"]["Client"]["PlanPrice"];

// TODO: link to the contact form on the website once it exists.
const INSTANCE_CONTACT_URL = "";

export const SubscriptionPlans = ({ plans }: { plans: Plan[] }) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const admin = useIsOrganizationAdmin({ organizationId: organization.id });

  const [pendingPriceId, setPendingPriceId] = useState<Option<PlanPrice["priceId"]>>(undefined);
  const [error, setError] = useState<Nullable<string>>(null);

  const checkout = async ({ priceId }: Pick<PlanPrice, "priceId">) => {
    startTransition(() => {
      setError(null);
      setPendingPriceId(priceId);
    });

    const result = await PaymentsCheckoutService.create().submit({
      orgId: organization.id,
      checkout: { priceId },
    });

    if (result.status === "error") {
      startTransition(() => {
        setError(errorReason(result.err) ?? i18n.subscription.text.checkout_error);
        setPendingPriceId(undefined);
      });
      return;
    }

    window.location.assign(result.result.url);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-xs font-medium">{i18n.subscription.text.plans_title}</h1>
        <p className="text-xs text-muted-foreground">
          {replacePlaceholders(i18n.subscription.text.plans_description, {
            "{name}": organization.name,
          })}
        </p>
      </div>

      {!admin && (
        <p className="text-xs text-muted-foreground">{i18n.subscription.text.admins_only}</p>
      )}

      {nonNullish(error) && (
        <ViewTransition>
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        </ViewTransition>
      )}

      {plans.length === 0 && (
        <p className="text-xs text-muted-foreground">{i18n.subscription.text.no_plans}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <PlanCard
            key={plan.productName}
            plan={plan}
            admin={admin}
            pendingPriceId={pendingPriceId}
            onChoose={checkout}
          />
        ))}

        <InstanceCard />
      </div>

      {plans.length > 0 && (
        <p className="text-xs text-muted-foreground">{i18n.subscription.text.vat_excluded}</p>
      )}
    </div>
  );
};

const PlanCard = ({
  plan: { productName, prices },
  admin,
  pendingPriceId,
  onChoose,
}: {
  plan: Plan;
  admin: boolean;
  pendingPriceId: Option<PlanPrice["priceId"]>;
  onChoose: (args: Pick<PlanPrice, "priceId">) => Promise<void>;
}) => {
  const { i18n } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{productName}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {prices.map((price) => (
          <div key={price.priceId} className="flex items-center justify-between gap-4">
            <PriceLabel price={price} />

            {admin && (
              <Button
                type="button"
                size="sm"
                disabled={nonNullish(pendingPriceId)}
                onClick={() => void onChoose({ priceId: price.priceId })}
              >
                {i18n.subscription.action.choose}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const PriceLabel = ({ price: { amount, currency: code, interval } }: { price: PlanPrice }) => {
  const { i18n } = useI18n();
  const formatAmount = useFormatAmount();
  const currencies = useCurrencies();

  const currency = currencies?.find((currency) => currency.code === code);

  return (
    <p className="text-sm">
      <span className="font-medium">
        {nonNullish(currency) ? formatAmount({ currency, amount }) : code}
      </span>{" "}
      <span className="text-muted-foreground">{i18n.subscription.interval[interval]}</span>
    </p>
  );
};

const InstanceCard = () => {
  const { i18n } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{i18n.subscription.text.instance_title}</CardTitle>
        <CardDescription>{i18n.subscription.text.instance_description}</CardDescription>
      </CardHeader>

      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          disabled={isEmptyString(INSTANCE_CONTACT_URL)}
          nativeButton={false}
          render={
            // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- labelled by the Button's children
            <a href={INSTANCE_CONTACT_URL} target="_blank" rel="noreferrer" />
          }
        >
          {i18n.subscription.action.get_in_touch}
        </Button>
      </CardFooter>
    </Card>
  );
};
