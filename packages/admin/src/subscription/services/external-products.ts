import { asc, eq } from "drizzle-orm";
import { assertArrayAtMostOne, type Option, type Result } from "@usenullish/nullish-common";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { deleteMany, selectMany } from "@usenullish/nullish-db";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";
import { insertExternalProduct } from "../_helpers/external-products";

const externalProducts = DbSchema.Subscription.ExternalProducts.ExternalProductsSchema;

type ExternalProduct = Records["Subscription"]["ExternalProducts"]["Select"];

export class ExternalProductsService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): ExternalProductsService {
    return new this(args);
  }

  list(): Promise<Result<ExternalProduct[]>> {
    return this._withDbContext((tx) =>
      selectMany({
        tx,
        table: externalProducts,
        schema: RecordsSchema.Subscription.ExternalProductsSchema.SelectExternalProductsSchema,
        orderBy: [asc(externalProducts.provider), asc(externalProducts.externalProductId)],
      }),
    );
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

      return await insertExternalProduct({ tx, externalProduct: values });
    });
  }

  delete({
    productId,
  }: {
    productId: ExternalProduct["id"];
  }): Promise<Result<Option<ExternalProduct>>> {
    return this._withDbContext(async (tx) => {
      const rows = await deleteMany({
        tx,
        table: externalProducts,
        returningSchema:
          RecordsSchema.Subscription.ExternalProductsSchema.SelectExternalProductsSchema,
        where: eq(externalProducts.id, productId),
      });

      assertArrayAtMostOne(rows);

      const [row] = rows;
      return row;
    });
  }
}
