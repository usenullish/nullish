export enum PaymentEventType {
  PAYMENT = "payment",
  INVOICE = "invoice",
}

export enum PaymentCancelStatus {
  CANCELLED = "cancelled",
  ALREADY_CANCELLED = "already_cancelled",
  NOT_SUBSCRIBED = "not_subscribed",
}
