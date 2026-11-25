import { asc, eq } from "drizzle-orm";
import { assertArrayAtMostOne, type Option, type Result } from "@usenullish/nullish-common";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { deleteMany, selectMany } from "@usenullish/nullish-db";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";
import { insertCustomProduct } from "../_helpers/custom-products";

const customProducts = DbSchema.Subscription.CustomProducts.CustomProductsSchema;

type CustomProduct = Records["Subscription"]["CustomProducts"]["Select"];

export class CustomProductsService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): CustomProductsService {
    return new this(args);
  }

  list(): Promise<Result<CustomProduct[]>> {
    return this._withDbContext((tx) =>
      selectMany({
        tx,
        table: customProducts,
        schema: RecordsSchema.Subscription.CustomProductsSchema.SelectCustomProductsSchema,
        orderBy: [asc(customProducts.name)],
      }),
    );
  }

  insert({
    customProduct,
  }: {
    customProduct: Records["Subscription"]["CustomProducts"]["Insert"];
  }): Promise<Result<CustomProduct>> {
    return this._withDbContext(async (tx) => {
      const values =
        RecordsSchema.Subscription.CustomProductsSchema.InsertCustomProductsSchema.parse(
          customProduct,
        );

      return await insertCustomProduct({ tx, customProduct: values });
    });
  }

  delete({
    productId,
  }: {
    productId: CustomProduct["id"];
  }): Promise<Result<Option<CustomProduct>>> {
    return this._withDbContext(async (tx) => {
      const rows = await deleteMany({
        tx,
        table: customProducts,
        returningSchema: RecordsSchema.Subscription.CustomProductsSchema.SelectCustomProductsSchema,
        where: eq(customProducts.id, productId),
      });

      assertArrayAtMostOne(rows);

      const [row] = rows;
      return row;
    });
  }
}
