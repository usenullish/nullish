import { isNullish, type Option } from "@usenullish/nullish-common";
import {
  type HandlePaymentEvent,
  type Payments,
  PaymentsSchema,
} from "@usenullish/nullish-schema/payments";
import { withDbContext } from "./_db";
import { PaymentSubscriptionService } from "./services/payment-subscription";

export abstract class PaymentProvider implements HandlePaymentEvent {
  protected constructor() {}

  async handle(args: Payments["Handle"]["Args"]): Promise<Option<Payments["Payment"]>> {
    const parsedArgs = PaymentsSchema.HandlePaymentEventArgsSchema.parse(args);

    const resolved = await this.resolve(parsedArgs);

    if (isNullish(resolved)) {
      return undefined;
    }

    const payment = PaymentsSchema.PaymentSchema.parse(resolved);

    const result = await withDbContext(async (dbContext) => {
      return await PaymentSubscriptionService.create({
        db: dbContext,
      }).sync({ payment });
    });

    if (result.status === "error") {
      throw result.err;
    }

    return payment;
  }

  protected abstract resolve(
    args: Payments["Handle"]["Args"],
  ): Promise<Option<Payments["Payment"]>>;
}
