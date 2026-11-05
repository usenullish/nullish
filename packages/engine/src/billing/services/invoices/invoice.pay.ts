import { type InvoiceServiceArgs } from "./_invoice";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Services } from "@usenullish/nullish-schema/services";
import { InvoiceWithPaymentService } from "./_invoice.with-payment";

type Invoice = Records["Billing"]["Invoices"]["Select"];

export class PayInvoiceService extends InvoiceWithPaymentService {
  private constructor(args: InvoiceServiceArgs) {
    super(args);
  }

  static create(args: InvoiceServiceArgs): PayInvoiceService {
    return new this(args);
  }

  pay(args: Services["Invoices"]["Pay"]["Args"]): Promise<Result<Invoice>> {
    return this._withViewRefresh(async () => {
      return await this.#pay(args);
    });
  }

  #pay(args: Services["Invoices"]["Pay"]["Args"]): Promise<Result<Invoice>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const { invoice } = await this._pay({ ...args, tx });
        return invoice;
      });
    });
  }
}
