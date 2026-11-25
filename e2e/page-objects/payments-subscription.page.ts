import { SubscriptionPage } from "./subscription.page";

const STRIPE_CHECKOUT_URL = "https://checkout.stripe.com/**";

export class PaymentsSubscriptionPage extends SubscriptionPage {
  override async subscribe(): Promise<void> {
    await this.page.route(STRIPE_CHECKOUT_URL, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<p>Checkout</p>" }),
    );

    await super.subscribe();
  }
}
