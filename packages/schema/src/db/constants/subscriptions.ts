export enum SubscriptionStatus {
  TRIALING = "trialing",
  ACTIVE = "active",
  PAST_DUE = "past_due",
  INACTIVE = "inactive",
}

export enum SubscriptionProvider {
  STRIPE = "stripe",
}

export enum OrganizationSubscriptionStatus {
  OPEN = "open",
  GRACE = "grace",
  LOCKED = "locked",
}
