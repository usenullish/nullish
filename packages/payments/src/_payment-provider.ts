import { isNullish, type Option } from "@usenullish/nullish-common";
import {
  type HandlePaymentEvent,
  type Payments,
  PaymentsSchema,
} from "@usenullish/nullish-schema/payments";

export abstract class PaymentProvider implements HandlePaymentEvent {
  protected constructor() {}

  async handle(
    args: Payments["Handle"]["Args"],
  ): Promise<Option<Payments["Payment"]>> {
    const parsedArgs = PaymentsSchema.HandlePaymentEventArgsSchema.parse(args);

    const subscription = await this.resolve(parsedArgs);

    return isNullish(subscription)
      ? undefined
      : PaymentsSchema.PaymentSchema.parse(subscription);
  }

  protected abstract resolve(
    args: Payments["Handle"]["Args"],
  ): Promise<Option<Payments["Payment"]>>;
}
