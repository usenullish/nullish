import { describe, expect, mock, spyOn, test } from "bun:test";
import { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import { MailType } from "@usenullish/nullish-schema/mail";
import { MAIL_RATE_LIMITS } from "../../src/_constants";
import { buildEmailAndPasswordConfig } from "../../src/server/_email-and-password";

const now = new Date();

const user = {
  id: "user-00000000-0000-4000-8000-000000000000",
  name: "Test",
  email: "test@test.dev",
  emailVerified: false,
  createdAt: now,
  updatedAt: now,
};

const url = "https://nullish.example.com/auth/callback?token=abc";

const publicUrl = "https://nullish.example.com/api/auth/callback?token=abc";

describe("buildEmailAndPasswordConfig", () => {
  describe("without mail", () => {
    test.each([true, false])("enables email and password with autoSignIn %p", (autoSignIn) => {
      expect(buildEmailAndPasswordConfig({ emailAndPassword: { autoSignIn } })).toEqual({
        emailAndPassword: { enabled: true, autoSignIn },
      });
    });

    test("does not configure the email verification", () => {
      expect(
        buildEmailAndPasswordConfig({ emailAndPassword: { autoSignIn: true } }).emailVerification,
      ).toBeUndefined();
    });
  });

  describe("with mail", () => {
    const build = () => {
      const send = mock(async () => {});

      return {
        send,
        config: buildEmailAndPasswordConfig({ emailAndPassword: { mail: { send } } }),
      };
    };

    test("enables email and password with a required email verification", () => {
      const { config } = build();

      expect(config.emailAndPassword).toMatchObject({
        enabled: true,
        requireEmailVerification: true,
      });
    });

    test("does not set autoSignIn", () => {
      const { config } = build();

      expect(config.emailAndPassword?.autoSignIn).toBeUndefined();
    });

    test("signs in after the email is verified", () => {
      const { config } = build();

      expect(config.emailVerification?.autoSignInAfterVerification).toBeTrue();
    });

    test("sends the verify email again on sign-in when the email is not verified", () => {
      const { config } = build();

      expect(config.emailVerification?.sendOnSignIn).toBeTrue();
    });

    test("sends the reset password email", async () => {
      const { send, config } = build();

      await config.emailAndPassword?.sendResetPassword?.({ user, url, token: "abc" });

      expect(send).toHaveBeenCalledWith({
        type: MailType.RESET_PASSWORD,
        to: "test@test.dev",
        lang: DefaultTemplateLanguage.EN,
        url: publicUrl,
      });
    });

    test("sends the verify email email", async () => {
      const { send, config } = build();

      await config.emailVerification?.sendVerificationEmail?.({ user, url, token: "abc" });

      expect(send).toHaveBeenCalledWith({
        type: MailType.VERIFY_EMAIL,
        to: "test@test.dev",
        lang: DefaultTemplateLanguage.EN,
        url: publicUrl,
      });
    });

    test.each([
      [
        "reset password",
        (config: ReturnType<typeof buildEmailAndPasswordConfig>) =>
          config.emailAndPassword?.sendResetPassword?.({ user, url: "invalid", token: "abc" }),
      ],
      [
        "verify email",
        (config: ReturnType<typeof buildEmailAndPasswordConfig>) =>
          config.emailVerification?.sendVerificationEmail?.({ user, url: "invalid", token: "abc" }),
      ],
    ])("does not send the %s email when its link is invalid", async (_, sendFn) => {
      const consoleError = spyOn(console, "error").mockImplementation(() => {});

      const { send, config } = build();

      await sendFn(config);

      expect(send).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledTimes(1);

      consoleError.mockRestore();
    });

    test("shares the rate limit of an address between the reset and the verify emails", async () => {
      const consoleWarn = spyOn(console, "warn").mockImplementation(() => {});

      const { send, config } = build();

      const { maxRequests } = MAIL_RATE_LIMITS.burst;

      await Promise.all(
        Array.from({ length: maxRequests + 1 }, (_, index) =>
          index % 2 === 0
            ? config.emailAndPassword?.sendResetPassword?.({ user, url, token: "abc" })
            : config.emailVerification?.sendVerificationEmail?.({ user, url, token: "abc" }),
        ),
      );

      expect(send).toHaveBeenCalledTimes(maxRequests);
      expect(consoleWarn).toHaveBeenCalledTimes(1);

      consoleWarn.mockRestore();
    });
  });
});
