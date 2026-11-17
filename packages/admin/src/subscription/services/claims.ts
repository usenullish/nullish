import { asc, eq } from "drizzle-orm";
import {
  assertArrayAtMostOne,
  assertNonNullish,
  type Option,
  type Result,
} from "@usenullish/nullish-common";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { insertMany, selectMany, updateMany } from "@usenullish/nullish-db";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";

const claims = DbSchema.Subscription.Claims.ClaimsSchema;

type Claim = Records["Subscription"]["Claims"]["Select"];

export class ClaimsService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): ClaimsService {
    return new this(args);
  }

  list(): Promise<Result<Claim[]>> {
    return this._withDbContext((tx) =>
      selectMany({
        tx,
        table: claims,
        schema: RecordsSchema.Subscription.ClaimsSchema.SelectClaimsSchema,
        orderBy: [asc(claims.expiresAt)],
      }),
    );
  }

  insert({
    claim,
  }: {
    claim: Records["Subscription"]["Claims"]["Insert"];
  }): Promise<Result<Claim>> {
    return this._withDbContext(async (tx) => {
      const values = RecordsSchema.Subscription.ClaimsSchema.InsertClaimsSchema.parse(claim);

      const [row] = await insertMany({
        tx,
        table: claims,
        values,
        returningSchema: RecordsSchema.Subscription.ClaimsSchema.SelectClaimsSchema,
      });

      assertNonNullish(row);

      return row;
    });
  }

  update({
    claimId,
    claim,
  }: {
    claimId: Claim["id"];
    claim: Records["Subscription"]["Claims"]["Update"];
  }): Promise<Result<Option<Claim>>> {
    return this._withDbContext(async (tx) => {
      const values = RecordsSchema.Subscription.ClaimsSchema.UpdateClaimsSchema.parse(claim);

      const rows = await updateMany({
        tx,
        table: claims,
        values,
        returningSchema: RecordsSchema.Subscription.ClaimsSchema.SelectClaimsSchema,
        where: eq(claims.id, claimId),
      });

      assertArrayAtMostOne(rows);

      const [row] = rows;
      return row;
    });
  }
}
