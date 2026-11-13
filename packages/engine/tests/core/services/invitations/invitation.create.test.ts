import { afterAll, beforeAll, describe, expect, mock, spyOn, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL, CryptoHasher } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { envAppUrl, envDbUrl } from "@usenullish/nullish-env";
import type { Nullable } from "@usenullish/nullish-common";
import { MailType, type SendMail } from "@usenullish/nullish-schema/mail";
import { INVITATION_ACCEPT_PATH, InvitationMailStatus } from "@usenullish/nullish-schema/server";
import { CreateInvitationService } from "../../../../src/core/services/invitations/invitation.create";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../_test-utils";

const invitations = DbSchema.Core.Invitations.InvitationsSchema;
const memberships = DbSchema.Core.Memberships.MembershipsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const invite = ({
  userId = TEST_USER_ID,
  organizationId,
  email,
  mail = null,
}: {
  userId?: string;
  organizationId: string;
  email: string;
  mail?: Nullable<SendMail>;
}) =>
  CreateInvitationService.create({
    db,
    userId,
    organizationId,
    values: { email, role: "accountant" },
    mail,
  }).create();

describe("CreateInvitationService", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("creates the invitation and returns it with its token", async () => {
    const result = await invite({ organizationId, email: "invited@test.dev" });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const { invitation, token } = result.result;

    expect(invitation.organizationId).toBe(organizationId);
    expect(invitation.email).toBe("invited@test.dev");
    expect(invitation.role).toBe("accountant");
    expect(invitation).not.toHaveProperty("tokenHash");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  test("stores only the SHA-256 hash of the token", async () => {
    const result = await invite({ organizationId, email: "hashed@test.dev" });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const [row] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, result.result.invitation.id));

    expect(row?.tokenHash).toBe(
      new CryptoHasher("sha256").update(result.result.token).digest("hex"),
    );
  });

  test("returns a different token for each invitation", async () => {
    const first = await invite({ organizationId, email: "first@test.dev" });
    const second = await invite({ organizationId, email: "second@test.dev" });

    if (first.status === "error" || second.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(first.result.token).not.toBe(second.result.token);
  });

  test("returns an error Result for an email already invited", async () => {
    await invite({ organizationId, email: "twice@test.dev" });

    const result = await invite({ organizationId, email: "Twice@test.dev" });

    expect(result.status).toBe("error");
  });

  test("returns an error Result for a member who is not an admin", async () => {
    const memberOrgId = await createOrganization(db, TEST_USER_ID);
    await db
      .insert(memberships)
      .values({ organizationId: memberOrgId, userId: TEST_OTHER_USER_ID, role: "accountant" });

    const result = await invite({
      userId: TEST_OTHER_USER_ID,
      organizationId: memberOrgId,
      email: "invited@test.dev",
    });

    expect(result.status).toBe("error");

    const rows = await db
      .select()
      .from(invitations)
      .where(eq(invitations.organizationId, memberOrgId));

    expect(rows).toEqual([]);
  });

  test("returns an error Result for a user outside the organization", async () => {
    const result = await invite({
      userId: TEST_OTHER_USER_ID,
      organizationId,
      email: "outsider@test.dev",
    });

    expect(result.status).toBe("error");
  });

  describe("link", () => {
    test("returns the link to accept the invitation", async () => {
      const result = await invite({ organizationId, email: "link@test.dev" });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const { link, token } = result.result;

      expect(link).toBe(`${envAppUrl()}${INVITATION_ACCEPT_PATH}#${token}`);
    });
  });

  describe("mail", () => {
    test("sends the invitation email with the link", async () => {
      const send = mock(async () => {});

      const result = await invite({ organizationId, email: "mailed@test.dev", mail: { send } });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(send).toHaveBeenCalledWith({
        type: MailType.INVITATION,
        to: "mailed@test.dev",
        url: result.result.link,
      });
      expect(result.result.mail).toBe(InvitationMailStatus.SENT);
    });

    test("returns no mail status without a mail provider", async () => {
      const result = await invite({ organizationId, email: "disabled@test.dev" });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.mail).toBeNull();
    });

    test("does not send the email when the invitation fails", async () => {
      const send = mock(async () => {});

      const result = await invite({
        userId: TEST_OTHER_USER_ID,
        organizationId,
        email: "not-sent@test.dev",
        mail: { send },
      });

      expect(result.status).toBe("error");
      expect(send).not.toHaveBeenCalled();
    });

    test("creates the invitation with the mail as failed when the email fails", async () => {
      const consoleError = spyOn(console, "error").mockImplementation(() => {});

      const send = mock(async () => {
        throw new Error("Connection refused");
      });

      const result = await invite({ organizationId, email: "failed@test.dev", mail: { send } });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.mail).toBe(InvitationMailStatus.FAILED);
      expect(consoleError).toHaveBeenCalledTimes(1);

      consoleError.mockRestore();
    });
  });
});
