import type { Route } from "./+types/orgs.$org-id.accounting.reports.vat.declaration";
import { isNullish } from "@usenullish/nullish-common";
import { RATE_DECIMALS } from "@usenullish/nullish-schema/db";
import { ReportPeriodSelect } from "~/components/reports/report-period";
import { VatDeclarationSection } from "~/components/reports/vat-declaration-section";
import { useI18n } from "~/kit/i18n/i18n.context";
import { loadVatDeclarationData } from "~/context/loaders/vat-declaration.loader.server";
import { VAT_PERIOD_ID_KEY } from "~/context/constants/periods.constants";

export const loader = async (args: Route.LoaderArgs) => {
  return await loadVatDeclarationData(args);
};

const formatRate = (rate: bigint): string => `${Number(rate) / 10 ** RATE_DECIMALS}%`;

const OrganizationVatDeclarationPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const { periods, period, declaration } = loaderData;

  if (isNullish(period)) {
    return <p className="text-xs text-muted-foreground">{i18n.vat.text.periods_empty}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <ReportPeriodSelect periods={periods} period={period} name={VAT_PERIOD_ID_KEY} />

      {!isNullish(declaration) && (
        <>
          <VatDeclarationSection
            title={i18n.reports.text.turnover}
            rows={[
              { box: "200", label: i18n.reports.box["200"], amount: declaration.box200 },
              { box: "220", label: i18n.reports.box["220"], amount: declaration.box220 },
              { box: "225", label: i18n.reports.box["225"], amount: declaration.box225 },
              { box: "235", label: i18n.reports.box["235"], amount: declaration.box235 },
              {
                box: "289",
                label: i18n.reports.box["289"],
                amount: declaration.box289,
                total: true,
              },
              {
                box: "299",
                label: i18n.reports.box["299"],
                amount: declaration.box299,
                total: true,
              },
            ]}
          />

          <VatDeclarationSection
            title={i18n.reports.text.tax_calculation}
            withTaxableBase
            rows={[
              ...[
                ...declaration.box302.map((item) => ({ box: "302", ...item })),
                ...declaration.box303.map((item) => ({ box: "303", ...item })),
              ].map(({ box, rate, taxableBase, taxAmount }) => ({
                box,
                label: `${i18n.reports.text.tax_rates} ${formatRate(rate)}`,
                taxableBase,
                amount: taxAmount,
              })),
              ...[
                ...declaration.box322.map((item) => ({ box: "322", ...item })),
                ...declaration.box323.map((item) => ({ box: "323", ...item })),
              ].map(({ box, rate, taxableBase, taxAmount }) => ({
                box,
                label: `${i18n.reports.text.net_rates} ${formatRate(rate)}`,
                taxableBase,
                amount: taxAmount,
              })),
              {
                box: "382",
                label: i18n.reports.box["382"],
                taxableBase: declaration.box382.taxableBase,
                amount: declaration.box382.taxAmount,
              },
              {
                box: "383",
                label: i18n.reports.box["383"],
                taxableBase: declaration.box383.taxableBase,
                amount: declaration.box383.taxAmount,
              },
              {
                box: "399",
                label: i18n.reports.box["399"],
                amount: declaration.box399,
                total: true,
              },
            ]}
          />

          <VatDeclarationSection
            title={i18n.reports.text.corrections}
            rows={[
              { box: "400", label: i18n.reports.box["400"], amount: declaration.box400 },
              { box: "405", label: i18n.reports.box["405"], amount: declaration.box405 },
              { box: "415", label: i18n.reports.box["415"], amount: declaration.box415 },
              { box: "470", label: i18n.reports.box["470"], amount: declaration.box470 },
              { box: "471", label: i18n.reports.box["471"], amount: declaration.box471 },
              {
                box: "479",
                label: i18n.reports.box["479"],
                amount: declaration.box479,
                total: true,
              },
              {
                box: "500",
                label: i18n.reports.box["500"],
                amount: declaration.box500,
                total: true,
              },
              {
                box: "510",
                label: i18n.reports.box["510"],
                amount: declaration.box510,
                total: true,
              },
            ]}
          />

          <VatDeclarationSection
            title={i18n.reports.text.other_flows}
            rows={[{ box: "910", label: i18n.reports.box["910"], amount: declaration.box910 }]}
          />
        </>
      )}
    </div>
  );
};

// /orgs/:orgId/reports/vat/declaration
export default OrganizationVatDeclarationPage;
