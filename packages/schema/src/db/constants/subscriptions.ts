export enum SubscriptionStatus {
  TRIALING = "trialing",
  ACTIVE = "active",
  PAST_DUE = "past_due",
  INACTIVE = "inactive",
}

export enum SubscriptionProvider {
  SELF = "self",
  CUSTOM = "custom",
  STRIPE = "stripe",
}

export enum BillingPeriod {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",
}

export enum OrganizationSubscriptionStatus {
  OPEN = "open",
  GRACE = "grace",
  LOCKED = "locked",
}
