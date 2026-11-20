import {
  type ComponentProps,
  type ReactNode,
  startTransition,
  useEffect,
  useState,
  ViewTransition,
} from "react";
import { CheckIcon } from "lucide-react";
import { isEmptyString, nonNullish, type Nullable, type Option } from "@usenullish/nullish-common";
import { PaymentInterval } from "@usenullish/nullish-schema/payments";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import * as z from "zod";
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
import contactPlansJson from "~/assets/subscription/plans.json";

type Plan = Api["PaymentsPlans"]["Client"]["Plan"];
type PlanPrice = Api["PaymentsPlans"]["Client"]["PlanPrice"];

enum ContactPlanType {
  INSTANCE = "instance",
  ON_PREM = "on_prem",
}

const ContactPlanPriceSchema = ApiSchema.PaymentsPlans.PlanPriceSchema.omit({ priceId: true });

const ContactPlanBaseSchema = z.strictObject({
  name: z.string(),
  contactUrl: z.string(),
});

const InstancePlanSchema = ContactPlanBaseSchema.extend({
  type: z.literal(ContactPlanType.INSTANCE),
  prices: z.array(ContactPlanPriceSchema).min(1),
});

const OnPremPlanSchema = ContactPlanBaseSchema.extend({
  type: z.literal(ContactPlanType.ON_PREM),
});

const ContactPlansSchema = z.array(
  z.discriminatedUnion("type", [InstancePlanSchema, OnPremPlanSchema]),
);

type ContactPlanPrice = z.infer<typeof ContactPlanPriceSchema>;
type InstancePlan = z.infer<typeof InstancePlanSchema>;
type OnPremPlan = z.infer<typeof OnPremPlanSchema>;

const contactPlans = ContactPlansSchema.safeParse(contactPlansJson).data ?? [];

export const SubscriptionPlans = ({ plans }: { plans: Plan[] }) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const admin = useIsOrganizationAdmin({ organizationId: organization.id });

  const intervals = Object.values(PaymentInterval).filter((interval) =>
    [
      ...plans.flatMap(({ prices }) => prices),
      ...contactPlans.flatMap((plan) =>
        plan.type === ContactPlanType.INSTANCE ? plan.prices : [],
      ),
    ].some((price) => price.interval === interval),
  );

  const [billing, setBilling] = useState<Option<PaymentInterval>>(
    intervals.includes(PaymentInterval.YEAR) ? PaymentInterval.YEAR : intervals[0],
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

  const pricedPlans = plans.flatMap((plan) => {
    const price = plan.prices.find((price) => price.interval === billing);
    return nonNullish(price) ? [{ plan, price }] : [];
  });

  return (
    <div className="flex flex-col gap-4">
      {intervals.length > 1 && (
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
          {intervals.map((value) => (
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

        {contactPlans.map((plan) =>
          plan.type === ContactPlanType.INSTANCE ? (
            <InstanceCard key={plan.name} plan={plan} billing={billing} />
          ) : (
            <OnPremCard key={plan.name} plan={plan} />
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
  onSubscribe: (args: Pick<PlanPrice, "priceId">) => Promise<void>;
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
            onClick={() => void onSubscribe({ priceId: price.priceId })}
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
  price: { amount, currency: code, interval },
}: {
  price: ContactPlanPrice;
}) => {
  const { i18n } = useI18n();
  const formatAmount = useFormatAmount();
  const currencies = useCurrencies();

  const currency = currencies?.find((currency) => currency.code === code);

  const format = (value: bigint): string =>
    nonNullish(currency) ? (formatAmount({ currency, amount: value }) ?? code) : code;

  const yearly = interval === PaymentInterval.YEAR;

  return (
    <p>
      <span className="text-base font-medium">{format(yearly ? (amount + 6n) / 12n : amount)}</span>{" "}
      <span className="text-xs text-muted-foreground">
        {yearly
          ? i18n.subscription.text.per_month_billed_yearly
          : i18n.subscription.interval[interval]}
      </span>
    </p>
  );
};

const InstanceCard = ({
  plan: { name, prices, contactUrl },
  billing,
}: {
  plan: InstancePlan;
  billing: Option<PaymentInterval>;
}) => {
  const { i18n } = useI18n();

  const price = prices.find(({ interval }) => interval === billing);

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

const OnPremCard = ({ plan: { name, contactUrl } }: { plan: OnPremPlan }) => {
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
