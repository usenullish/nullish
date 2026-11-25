# payments

The subscriptions at a payment provider: the plans and their prices, the checkout, the customer portal, the cancellation, and the webhooks that keep the subscriptions in sync. Stripe is the only provider for now.

## Provider

- `PaymentProvider` (`src/_payment-provider.ts`) implements `ProcessPayments` (`nullish-schema/payments`), the interface the server receives. It holds the flow of every action and leaves the calls to the provider to abstract methods (`loadPlans`, `createCheckoutSession`, `decode`, `loadPayment`, …). `StripePaymentProvider` (`src/_stripe.ts`) implements them, and `createPaymentProvider` creates it.
- The server only creates the provider when the payments are enabled (`envPaymentsEnabled`), otherwise it passes `null` and the routes answer that the payments are not enabled.
- The Stripe client uses the API version of the installed SDK: no `apiVersion` is pinned, as stripe-node recommends, and a new API version comes with a major version of the package. `NULLISH_STRIPE_API_URL` points it to stripe-mock in the end-to-end tests, never in production.

## Database

- The services in `src/services/` run without a user (`AdminServiceContext`, through `DbAdminContext`), since the webhooks have none. The actions of a user (checkout, portal, cancel) therefore check the admin membership themselves (`PaymentsServiceContext._assertAdminMembership`).
- A service `prepare`s an action (checks and reads what the provider needs) or `sync`s its result. The calls to the provider happen in between, in `PaymentProvider`, outside of any transaction.

## Webhooks

- The server receives the events on `/payments/stripe/webhook` and passes the payload and its signature to `handle`, which verifies them with the webhook secret.
- Events can arrive twice and in any order, so the subscription is always read back from the provider before it is synced, never taken from the event.
- The first payment of a subscription links the organization to the provider (`subscription_references`). The `organizationId` travels in the metadata of the subscription, set at checkout.
- A draft invoice of a renewal gets the tax rate valid on its date (`subscription_tax_rates`), so that a change of the VAT rate applies to the next period.

## Tests

Tests live in `tests/`. The services' tests (`tests/services/`) run against the test database. The provider tests (`tests/stripe.test.ts`) never reach Stripe: they stub `fetch`, which the SDK uses for its requests, and the database (`src/_db`). The end-to-end suites cover the rest: `payments` against stripe-mock, `stripe` against the real sandbox.
