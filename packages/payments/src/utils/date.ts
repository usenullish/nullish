// Stripe returns timestamps in seconds. Measured since the Unix epoch.
export const timestampsToDate = (seconds: number): Date => {
  return new Date(seconds * 1000);
};
