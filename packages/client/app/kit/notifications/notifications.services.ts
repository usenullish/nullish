import * as z from "zod";

export enum NotificationLevel {
  ERROR = "error",
  SUCCESS = "success",
}

const NotificationSchema = z.strictObject({
  id: z.string(),
  level: z.enum(NotificationLevel),
  msg: z.string(),
  detail: z.unknown().optional(),
  date: z.date(),
  read: z.boolean(),
});

const NotificationsSchema = z.array(NotificationSchema);

export type Notification = z.infer<typeof NotificationSchema>;

export type Notifications = z.infer<typeof NotificationsSchema>;

export type NotifyArgs = Pick<Notification, "level" | "msg" | "detail">;
