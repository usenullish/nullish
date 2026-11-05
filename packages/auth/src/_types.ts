import type { Session, User } from "better-auth";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Nullish } from "@usenullish/nullish-common";

type SelectMemberships = Records["Core"]["Memberships"]["Select"];
type Role = Pick<SelectMemberships, "role" | "organizationId">;

export interface CustomSession {
  user: User & { roles?: Role[]; twoFactorEnabled?: Nullish<boolean> };
  session: Session;
}
