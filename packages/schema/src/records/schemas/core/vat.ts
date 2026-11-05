import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  VatSettingsSchema,
  VatMethodsSchema,
  VatRatesSchema,
  VatPeriodsSchema,
} from "../../../db/schemas/core/vat";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";
import * as z from "zod";
import { VatPaymentMethod, VatPeriodStatus, VatRemunerationMethod, VatType } from "../../../db";
import { VatNumberSchema } from "@usenullish/nullish-common";

// Drizzle does not correctly infer the enum
const refineVatMethodsEnums = {
  remunerationMethod: z.enum(VatRemunerationMethod),
  paymentMethod: z.enum(VatPaymentMethod),
};

const refineVatRatesEnums = {
  type: z.enum(VatType),
};

const refineVatPeriodStatusEnums = {
  status: z.enum(VatPeriodStatus),
};

export const SelectVatSettingsSchema = createSelectSchema(VatSettingsSchema);
export const InsertVatSettingsSchema = createInsertSchema(VatSettingsSchema)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...INSERT_OMIT_FIELDS,
  })
  .extend({
    vatNumber: VatNumberSchema,
  });
export const UpdateVatSettingsSchema = createUpdateSchema(VatSettingsSchema)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
  })
  .extend({
    vatNumber: VatNumberSchema,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);

export const SelectVatMethodsSchema = createSelectSchema(VatMethodsSchema, refineVatMethodsEnums);
export const InsertVatMethodsSchema = createInsertSchema(
  VatMethodsSchema,
  refineVatMethodsEnums,
).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  ...INSERT_OMIT_FIELDS,
});
export const UpdateVatMethodsSchema = createUpdateSchema(VatMethodsSchema, refineVatMethodsEnums)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
    periodId: true,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);

export const SelectVatRatesSchema = createSelectSchema(VatRatesSchema, refineVatRatesEnums);
export const InsertVatRatesSchema = createInsertSchema(VatRatesSchema, refineVatRatesEnums).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  ...INSERT_OMIT_FIELDS,
});
export const UpdateVatRatesSchema = createUpdateSchema(VatRatesSchema, refineVatRatesEnums)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);

export const SelectVatPeriodsSchema = createSelectSchema(
  VatPeriodsSchema,
  refineVatPeriodStatusEnums,
);
export const InsertVatPeriodsSchema = createInsertSchema(
  VatPeriodsSchema,
  refineVatPeriodStatusEnums,
).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  ...INSERT_OMIT_FIELDS,
});
export const UpdateVatPeriodsSchema = createUpdateSchema(
  VatPeriodsSchema,
  refineVatPeriodStatusEnums,
)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);

export const FilterVatRatesSchema = z.strictObject({
  type: refineVatRatesEnums.type.optional(),
  validOn: SelectVatRatesSchema.shape.startOn.optional(),
});

export const FilterVatPeriodsSchema = z.strictObject({
  status: refineVatPeriodStatusEnums.status.optional(),
});
