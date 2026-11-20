import { assertNonNullish, type Result } from "@usenullish/nullish-common";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { insertMany } from "@usenullish/nullish-db";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";

const externalProducts = DbSchema.Subscription.ExternalProducts.ExternalProductsSchema;

type ExternalProduct = Records["Subscription"]["ExternalProducts"]["Select"];

export class ExternalProductsService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): ExternalProductsService {
    return new this(args);
  }

  insert({
    externalProduct,
  }: {
    externalProduct: Records["Subscription"]["ExternalProducts"]["Insert"];
  }): Promise<Result<ExternalProduct>> {
    return this._withDbContext(async (tx) => {
      const values =
        RecordsSchema.Subscription.ExternalProductsSchema.InsertExternalProductsSchema.parse(
          externalProduct,
        );

      const [row] = await insertMany({
        tx,
        table: externalProducts,
        values,
        returningSchema:
          RecordsSchema.Subscription.ExternalProductsSchema.SelectExternalProductsSchema,
      });

      assertNonNullish(row);

      return row;
    });
  }
}
