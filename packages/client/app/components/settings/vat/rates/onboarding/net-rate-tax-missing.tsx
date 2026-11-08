import { Link } from "react-router";
import { TriangleAlert } from "lucide-react";
import type { Api } from "@usenullish/nullish-schema/server";
import { VatPaymentMethod, VatType } from "@usenullish/nullish-schema/db";
import { Alert, AlertDescription } from "~/ui/components/alert";
import { useOrganization } from "~/context/contexts/organization.context";
import { AccountingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

type VatRate = Api["VatRates"]["Client"]["VatRate"];
type VatMethod = Api["VatMethods"]["Client"]["VatMethod"];

const isNetRateTaxMissing = ({
  vatRates,
  vatMethods,
}: {
  vatRates: VatRate[];
  vatMethods: VatMethod[];
}): boolean =>
  vatMethods.some(({ paymentMethod }) => paymentMethod === VatPaymentMethod.NET_RATE) &&
  !vatRates.some(({ type }) => type === VatType.NET_RATE_TAX);

export const NetRateTaxMissing = ({
  vatRates,
  vatMethods,
}: {
  vatRates: VatRate[];
  vatMethods: VatMethod[];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  if (!isNetRateTaxMissing({ vatRates, vatMethods })) {
    return null;
  }

  return (
    <Alert variant="warning" className="mb-8">
      <TriangleAlert />
      <AlertDescription>
        <span>
          {i18n.vat.text.net_rate_tax_missing}{" "}
          <Link
            to={AccountingPath.create({ organizationId: organization.id }).to({
              path: "/vat/rates/new",
            })}
            className="underline underline-offset-4 hover:text-foreground"
          >
            {i18n.vat.action.create_rate_now}
          </Link>
        </span>
      </AlertDescription>
    </Alert>
  );
};
