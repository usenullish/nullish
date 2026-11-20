import {
  type ComponentProps,
  type ReactNode,
  startTransition,
  useEffect,
  useState,
  ViewTransition,
} from "react";
import { useSearchParams } from "react-router";
import { CheckIcon } from "lucide-react";
import { isEmptyString, nonNullish, type Nullable, type Option } from "@usenullish/nullish-common";
import { BillingPeriod } from "@usenullish/nullish-schema/db";
import { type Api, ApiSchema, SUBSCRIPTION_BILLING_PARAM } from "@usenullish/nullish-schema/server";
import { PaymentsCheckoutService } from "~/lib/services/payments+checkout.services";
import { useOrganization } from "~/context/contexts/organization.context";
import { useCurrencies } from "~/context/contexts/currencies.context";
import { useIsOrganizationAdmin } from "~/context/hooks/memberships.hooks";
import { errorReason } from "~/kit/error-drawer/errors.utils";
import { useFormatAmount } from "~/kit/format/amount.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { Button } from "~/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/ui/components/card";
import { ToggleGroup, ToggleGroupItem } from "~/ui/components/toggle-group";

type Plan = Api["ExternalPlans"]["Client"]["ExternalPlan"];
type PlanPrice = Api["ExternalPlans"]["Client"]["ExternalPlanPrice"];
type CustomPlan = Api["CustomPlans"]["Client"]["CustomPlan"];
type CustomPlanPrice = Api["CustomPlans"]["Client"]["CustomPlanPrice"];

const BillingPeriodSchema =
  ApiSchema.PaymentsCheckout.CheckoutPaymentsRequestSchema.shape.billingPeriod;

export const SubscriptionPlans = ({
  plans,
  customPlans,
}: {
  plans: Plan[];
  customPlans: CustomPlan[];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const admin = useIsOrganizationAdmin({ organizationId: organization.id });

  const billingPeriods = Object.values(BillingPeriod).filter((billingPeriod) =>
    [...plans.flatMap(({ prices }) => prices), ...customPlans.flatMap(({ prices }) => prices)].some(
      (price) => price.billingPeriod === billingPeriod,
    ),
  );

  const [searchParams, setSearchParams] = useSearchParams();

  const billingFromUrl = BillingPeriodSchema.safeParse(
    searchParams.get(SUBSCRIPTION_BILLING_PARAM),
  ).data;

  const billing: Option<BillingPeriod> =
    nonNullish(billingFromUrl) && billingPeriods.includes(billingFromUrl)
      ? billingFromUrl
      : billingPeriods.includes(BillingPeriod.YEAR)
        ? BillingPeriod.YEAR
        : billingPeriods[0];

  const setBilling = (value: BillingPeriod) =>
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        params.set(SUBSCRIPTION_BILLING_PARAM, value);
        return params;
      },
      { replace: true, preventScrollReset: true },
    );

  const [pendingPriceId, setPendingPriceId] = useState<Option<PlanPrice["priceId"]>>(undefined);
  const [error, setError] = useState<Nullable<string>>(null);

  useEffect(() => {
    const onPageShow = ({ persisted }: PageTransitionEvent) => {
      if (persisted) {
        startTransition(() => setPendingPriceId(undefined));
      }
    };

    window.addEventListener("pageshow", onPageShow);

    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const checkout = async ({
    priceId,
    billingPeriod,
  }: Pick<PlanPrice, "priceId" | "billingPeriod">) => {
    startTransition(() => {
      setError(null);
      setPendingPriceId(priceId);
    });

    const result = await PaymentsCheckoutService.create().submit({
      orgId: organization.id,
      checkout: { priceId, billingPeriod },
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

  const pricedPlans = plans.flatMap((plan) => {
    const price = plan.prices.find((price) => price.billingPeriod === billing);
    return nonNullish(price) ? [{ plan, price }] : [];
  });

  return (
    <div className="flex flex-col gap-4">
      {billingPeriods.length > 1 && (
        <ToggleGroup
          value={nonNullish(billing) ? [billing] : []}
          onValueChange={(values) => {
            const [value] = values;

            if (nonNullish(value)) {
              startTransition(() => setBilling(value));
            }
          }}
          aria-label={i18n.subscription.label.billing}
          className="self-end"
        >
          {billingPeriods.map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {i18n.subscription.billing[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

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
        {pricedPlans.map(({ plan, price }) => (
          <PlanCard
            key={plan.productName}
            plan={plan}
            price={price}
            admin={admin}
            pendingPriceId={pendingPriceId}
            onSubscribe={checkout}
          />
        ))}

        {customPlans.map((plan) =>
          plan.prices.length > 0 ? (
            <InstanceCard key={plan.plan.id} plan={plan} billing={billing} />
          ) : (
            <OnPremCard key={plan.plan.id} plan={plan} />
          ),
        )}
      </div>

      {plans.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{i18n.subscription.text.vat_excluded}</p>
      )}
    </div>
  );
};

const PlanCard = ({
  plan: { productName },
  price,
  admin,
  pendingPriceId,
  onSubscribe,
}: {
  plan: Plan;
  price: PlanPrice;
  admin: boolean;
  pendingPriceId: Option<PlanPrice["priceId"]>;
  onSubscribe: (args: Pick<PlanPrice, "priceId" | "billingPeriod">) => Promise<void>;
}) => {
  const { i18n } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">{productName}</CardTitle>
        <CardDescription>{i18n.subscription.text.cloud_description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <PriceLabel price={price} />
        <FeatureList features={i18n.subscription.cloud_features} />
      </CardContent>

      {admin && (
        <CardFooter>
          <Button
            type="button"
            className="w-full"
            disabled={nonNullish(pendingPriceId)}
            onClick={() =>
              void onSubscribe({ priceId: price.priceId, billingPeriod: price.billingPeriod })
            }
          >
            {i18n.subscription.action.subscribe}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

const FeatureList = ({ features }: { features: Record<string, string> }) => (
  <ul className="flex flex-col gap-2">
    {Object.entries(features).map(([key, feature]) => (
      <li key={key} className="flex items-center gap-2">
        <CheckIcon className="size-3.5 text-muted-foreground" />
        {feature}
      </li>
    ))}
  </ul>
);

const PriceLabel = ({
  price: { amount, currency: code, billingPeriod },
}: {
  price: Pick<CustomPlanPrice, "amount" | "currency" | "billingPeriod">;
}) => {
  const { i18n } = useI18n();
  const formatAmount = useFormatAmount();
  const currencies = useCurrencies();

  const currency = currencies?.find((currency) => currency.code === code);

  const format = (value: bigint): string =>
    nonNullish(currency) ? (formatAmount({ currency, amount: value }) ?? code) : code;

  const yearly = billingPeriod === BillingPeriod.YEAR;

  return (
    <p>
      <span className="text-base font-medium">{format(yearly ? (amount + 6n) / 12n : amount)}</span>{" "}
      <span className="text-xs text-muted-foreground">
        {yearly
          ? i18n.subscription.text.per_month_billed_yearly
          : i18n.subscription.billing_period[billingPeriod]}
      </span>
    </p>
  );
};

const InstanceCard = ({
  plan: {
    product: { name, contactUrl },
    prices,
  },
  billing,
}: {
  plan: CustomPlan;
  billing: Option<BillingPeriod>;
}) => {
  const { i18n } = useI18n();

  const price = prices.find(({ billingPeriod }) => billingPeriod === billing);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">{name}</CardTitle>
        <CardDescription>{i18n.subscription.text.instance_description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {nonNullish(price) && <PriceLabel price={price} />}
        <FeatureList features={i18n.subscription.instance_features} />
      </CardContent>

      <ContactFooter contactUrl={contactUrl} variant="default">
        {i18n.subscription.action.request_instance}
      </ContactFooter>
    </Card>
  );
};

const OnPremCard = ({
  plan: {
    product: { name, contactUrl },
  },
}: {
  plan: CustomPlan;
}) => {
  const { i18n } = useI18n();

  return (
    <Card className="mt-4 sm:col-span-2">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">{name}</CardTitle>
        <CardDescription>{i18n.subscription.text.on_prem_description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-base font-medium">{i18n.subscription.text.custom_pricing}</p>
        <FeatureList features={i18n.subscription.on_prem_features} />
      </CardContent>

      <ContactFooter contactUrl={contactUrl} variant="outline">
        {i18n.subscription.action.get_in_touch}
      </ContactFooter>
    </Card>
  );
};

const ContactFooter = ({
  contactUrl,
  variant,
  children,
}: { contactUrl: string; children: ReactNode } & Pick<
  ComponentProps<typeof Button>,
  "variant"
>) => (
  <CardFooter>
    <Button
      variant={variant}
      className="w-full"
      disabled={isEmptyString(contactUrl)}
      nativeButton={false}
      render={
        // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- labelled by the Button's children
        <a href={contactUrl} target="_blank" rel="noreferrer" />
      }
    >
      {children}
    </Button>
  </CardFooter>
);
