import {
  BookOpen,
  DatabaseArrowUp,
  FileText,
  Landmark,
  type LucideIcon,
  Receipt,
  Scale,
  ScrollText,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  UsersRound,
} from "lucide-react";
import type { Api } from "@usenullish/nullish-schema/server";
import { isEmptyString, isNullish, nonNullish, type Option } from "@usenullish/nullish-common";
import type { I18n } from "~/kit/i18n/i18n";

type OrganizationId = Api["Organizations"]["Client"]["Organization"]["id"];
type ConversationId = Api["Conversations"]["Client"]["Conversation"]["id"];

export type RelativePath = "" | `/${string}`;

type NavigationKey = keyof I18n["navigation"];

export interface NavigationItem {
  title: NavigationKey;
  path: RelativePath;
  match?: RelativePath;
  icon?: LucideIcon;
}

export interface NavigationGroup {
  label: NavigationKey;
  labelHidden?: boolean;
  icon?: LucideIcon;
  collapsible?: boolean;
  items: NavigationItem[];
}

// We used this constant to identify and sign-in/up on the index page to potentially
// redirect a user to their organization in case they only have one.
// We do not use the location.pathname because sign-in occurs on root / and /sign-in paths.
export const AUTH_NAVIGATION: {
  signIn: RelativePath;
  signInTwoFactor: RelativePath;
  signUp: RelativePath;
  signUpVerifyEmail: RelativePath;
  forgotPassword: RelativePath;
  forgotPasswordSent: RelativePath;
  resetPassword: RelativePath;
  resetPasswordDone: RelativePath;
} = {
  signIn: "/sign-in",
  signInTwoFactor: "/sign-in/two-factor",
  signUp: "/sign-up",
  signUpVerifyEmail: "/sign-up/verify-email",
  forgotPassword: "/forgot-password",
  forgotPasswordSent: "/forgot-password/sent",
  resetPassword: "/reset-password",
  resetPasswordDone: "/reset-password/done",
};

export const INVITATION_ACCEPT_PATH = "/invitations/accept";

// Only shown to the admins of the organization.
export const TEAM_NAVIGATION_GROUP: NavigationGroup = {
  label: "team",
  icon: UsersRound,
  collapsible: true,
  items: [
    { title: "members", path: "/team/members" },
    { title: "invitations", path: "/team/invitations" },
  ],
};

// Only shown to the admins of the organization.
export const MIGRATIONS_NAVIGATION_GROUP: NavigationGroup = {
  label: "migrations",
  icon: DatabaseArrowUp,
  collapsible: true,
  items: [{ title: "migrations", path: "/migrations" }],
};

export const NAVIGATION: NavigationGroup[] = [
  {
    label: "assistant",
    labelHidden: true,
    items: [{ title: "assistant", path: "", match: "/conversations", icon: Sparkles }],
  },
  {
    label: "billing",
    items: [
      { title: "clients", path: "/billing/clients", icon: Users },
      { title: "invoices", path: "/billing/invoices", icon: FileText },
    ],
  },
  {
    label: "banking",
    items: [{ title: "bank_relations", path: "/banking", icon: Landmark }],
  },
  {
    label: "accounting",
    items: [
      { title: "journal", path: "/accounting/journal", icon: BookOpen },
      { title: "balance_sheet", path: "/accounting/reports/balance-sheet", icon: Scale },
      {
        title: "income_statement",
        path: "/accounting/reports/income-statement",
        icon: TrendingUp,
      },
      {
        title: "account_ledger",
        path: "/accounting/reports/account-ledger",
        icon: ScrollText,
      },
      {
        title: "vat_declaration",
        path: "/accounting/reports/vat/declaration",
        icon: Receipt,
      },
    ],
  },
  TEAM_NAVIGATION_GROUP,
  {
    label: "settings",
    icon: Settings,
    collapsible: true,
    items: [
      {
        title: "details",
        path: "/settings/organization/details",
        match: "/settings/organization",
      },
      { title: "billing", path: "/billing/settings/general", match: "/billing/settings" },
      {
        title: "accounting",
        path: "/accounting/settings/periods",
        match: "/accounting/settings",
      },
      { title: "vat", path: "/accounting/vat/settings", match: "/accounting/vat" },
    ],
  },
  MIGRATIONS_NAVIGATION_GROUP,
];

export const ORGANIZATION_TABS: NavigationItem[] = [
  { title: "details", path: "/settings/organization/details" },
];

export const BILLING_TABS: NavigationItem[] = [
  { title: "settings", path: "/billing/settings/general" },
  { title: "document_templates", path: "/billing/settings/document-templates" },
];

export const ACCOUNTING_TABS: NavigationItem[] = [
  { title: "periods", path: "/accounting/settings/periods" },
  { title: "accounts", path: "/accounting/settings/accounts" },
  { title: "system_accounts", path: "/accounting/settings/system-accounts" },
];

export const VAT_TABS: NavigationItem[] = [
  { title: "settings", path: "/accounting/vat/settings" },
  { title: "methods", path: "/accounting/vat/methods" },
  { title: "periods", path: "/accounting/vat/periods" },
  { title: "rates", path: "/accounting/vat/rates" },
];

export class OrganizationPath {
  readonly #base: string;

  protected constructor({
    organizationId,
    subPath,
  }: {
    organizationId: OrganizationId;
    subPath?: RelativePath;
  }) {
    this.#base = `/orgs/${organizationId}${subPath ?? ""}`;
  }

  static create(args: { organizationId: OrganizationId }): OrganizationPath {
    return new this(args);
  }

  to({ path }: { path: RelativePath } = { path: "" }): string {
    return `${this.#base}${path}`;
  }

  toSettings({ path }: { path: RelativePath } = { path: "" }): string {
    return this.to({ path: `/settings${path}` });
  }
}

export class BillingPath extends OrganizationPath {
  protected constructor({ organizationId }: { organizationId: OrganizationId }) {
    super({ organizationId, subPath: "/billing" });
  }
}

export class BankingPath extends OrganizationPath {
  protected constructor({ organizationId }: { organizationId: OrganizationId }) {
    super({ organizationId, subPath: "/banking" });
  }
}

export class AccountingPath extends OrganizationPath {
  protected constructor({ organizationId }: { organizationId: OrganizationId }) {
    super({ organizationId, subPath: "/accounting" });
  }
}

export class OrganizationRootPath extends OrganizationPath {
  static override create(args: { organizationId: OrganizationId }): OrganizationRootPath {
    return new this(args);
  }

  toConversation({ conversationId }: { conversationId: ConversationId }): string {
    return this.to({ path: `/conversations/${conversationId}` });
  }

  toAssistant({ conversationId }: { conversationId: Option<ConversationId> }): string {
    if (isNullish(conversationId)) {
      return this.to();
    }

    return this.toConversation({ conversationId });
  }

  findActiveItem({ pathname }: Pick<URL, "pathname">): Option<NavigationItem> {
    const relative = pathname.replace(this.to(), "");

    const [active] = NAVIGATION.flatMap(({ items }) => items)
      .filter(({ path, match }) =>
        isEmptyString(path)
          ? isEmptyString(relative) ||
            relative === "/" ||
            (nonNullish(match) && relative.startsWith(match))
          : relative.startsWith(match ?? path),
      )
      .toSorted((a, b) => (b.match ?? b.path).length - (a.match ?? a.path).length);

    return active;
  }
}

export class UnscopedPath {
  static create(): UnscopedPath {
    return new this();
  }

  to({ path }: { path: RelativePath } = { path: "/" }): string {
    return path;
  }

  toConversation({ conversationId }: { conversationId: ConversationId }): string {
    return this.to({ path: `/conversations/${conversationId}` });
  }
}

export class InvitationPath {
  readonly #token: string;

  private constructor({ token }: { token: string }) {
    this.#token = token;
  }

  static create(args: { token: string }): InvitationPath {
    return new this(args);
  }

  toAccept(): string {
    return `${INVITATION_ACCEPT_PATH}#${this.#token}`;
  }
}
