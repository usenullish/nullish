import {
  ExtraConfigColumn,
  type PgColumnBaseConfig,
  type AnyPgTable,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import * as pg from "drizzle-orm/pg-core";
import { type ColumnType, sql } from "drizzle-orm";
import { authenticatedUser } from "./_roles";

const commonOrganizationPolicies = ({
  organizationId,
  tableName,
}: {
  organizationId: ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;
  tableName: string;
}) => [
  pg.pgPolicy(`${tableName}_select_policy`, {
    for: "select",
    to: [authenticatedUser],
    using: userBelongsToOrg({ organizationId }),
  }),
  pg.pgPolicy(`${tableName}_update_policy`, {
    for: "update",
    to: [authenticatedUser],
    using: userIsOrgEditor({ organizationId }),
  }),
  pg.pgPolicy(`${tableName}_delete_policy`, {
    for: "delete",
    to: [authenticatedUser],
    using: userIsOrgEditor({ organizationId }),
  }),
];

export const coreOrganizationPolicies = ({
  organizationId,
  deletedAt,
  tableName,
}: {
  organizationId: ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;
  deletedAt: ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;
  tableName: string;
}) => {
  // userIsOrgAdmin cannot be used here: it reads core.organizations, and a policy of a table
  // that reads the same table makes Postgres fail with an infinite recursion.
  const isAdmin = sql`${organizationId} IN (
    SELECT organization_id FROM core.memberships
    WHERE user_id = auth.current_user_id() AND role = 'admin'
  )`;

  return [
    pg.pgPolicy(`${tableName}_select_policy`, {
      for: "select",
      to: [authenticatedUser],
      using: userBelongsToOrg({ organizationId }),
    }),
    pg.pgPolicy(`${tableName}_update_policy`, {
      for: "update",
      to: [authenticatedUser],
      using: sql`${deletedAt} IS NULL AND ${isAdmin}`,
      withCheck: isAdmin,
    }),
    // Any registered user can create organizations
    pg.pgPolicy(`${tableName}_insert_policy`, {
      for: "insert",
      to: [authenticatedUser],
      withCheck: sql`auth.current_user_id() IS NOT NULL`,
    }),
    // Delete is scheduled through updating deleted_at field
  ];
};

export const organizationPolicies = ({
  organizationId,
  tableName,
}: {
  organizationId: ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;
  tableName: string;
}) => [
  ...commonOrganizationPolicies({ organizationId, tableName }),
  pg.pgPolicy(`${tableName}_insert_policy`, {
    for: "insert",
    to: [authenticatedUser],
    withCheck: userIsOrgEditor({ organizationId }),
  }),
];

export const membershipPolicies = ({
  userId,
  organizationId,
}: {
  userId: ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;
  organizationId: ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;
}) => [
  pg.pgPolicy(`memberships_select_policy`, {
    for: "select",
    to: [authenticatedUser],
    using: sql`${userId} = auth.current_user_id()`,
  }),
  pg.pgPolicy(`memberships_insert_policy`, {
    for: "insert",
    to: [authenticatedUser],
    withCheck: userIsOrgAdmin({ organizationId }),
  }),
  pg.pgPolicy(`memberships_update_policy`, {
    for: "update",
    to: [authenticatedUser],
    using: userIsOrgAdmin({ organizationId }),
  }),
  pg.pgPolicy(`memberships_delete_policy`, {
    for: "delete",
    to: [authenticatedUser],
    using: userIsOrgAdmin({ organizationId }),
  }),
];

export const invitationPolicies = ({
  organizationId,
}: {
  organizationId: ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;
}) => [
  pg.pgPolicy(`invitations_select_policy`, {
    for: "select",
    to: [authenticatedUser],
    using: userIsOrgAdmin({ organizationId }),
  }),
  pg.pgPolicy(`invitations_insert_policy`, {
    for: "insert",
    to: [authenticatedUser],
    withCheck: userIsOrgAdmin({ organizationId }),
  }),
  pg.pgPolicy(`invitations_delete_policy`, {
    for: "delete",
    to: [authenticatedUser],
    using: userIsOrgAdmin({ organizationId }),
  }),
];

export const meteringPolicies = ({
  userId,
  tableName,
}: {
  userId: ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;
  tableName: string;
}) => [
  pg.pgPolicy(`${tableName}_select_policy`, {
    for: "select",
    to: [authenticatedUser],
    using: sql`${userId} = auth.current_user_id()`,
  }),
];

export const chatConversationPolicies = ({
  userId,
  organizationId,
}: {
  userId: ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;
  organizationId: ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;
}) => {
  const ownedInMemberOrg = sql`${userId} = auth.current_user_id() AND (${organizationId} IS NULL OR ${userBelongsToOrg({ organizationId })})`;

  return [
    pg.pgPolicy(`conversations_select_policy`, {
      for: "select",
      to: [authenticatedUser],
      using: ownedInMemberOrg,
    }),
    pg.pgPolicy(`conversations_insert_policy`, {
      for: "insert",
      to: [authenticatedUser],
      withCheck: ownedInMemberOrg,
    }),
    pg.pgPolicy(`conversations_update_policy`, {
      for: "update",
      to: [authenticatedUser],
      using: sql`${userId} = auth.current_user_id()`,
      withCheck: ownedInMemberOrg,
    }),
    pg.pgPolicy(`conversations_delete_policy`, {
      for: "delete",
      to: [authenticatedUser],
      using: sql`${userId} = auth.current_user_id()`,
    }),
  ];
};

export const chatMessagesPolicies = ({
  joinedColumnId,
  joinedTable,
}: {
  joinedColumnId: ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;
  joinedTable: AnyPgTable;
}) => {
  const ownedJoined = sql`${joinedColumnId} IN (
    SELECT id FROM ${joinedTable}
  WHERE user_id = auth.current_user_id()
  )`;

  return [
    pg.pgPolicy(`messages_select_policy`, {
      for: "select",
      to: [authenticatedUser],
      using: ownedJoined,
    }),
    pg.pgPolicy(`messages_insert_policy`, {
      for: "insert",
      to: [authenticatedUser],
      withCheck: ownedJoined,
    }),
    pg.pgPolicy(`messages_delete_policy`, {
      for: "delete",
      to: [authenticatedUser],
      using: ownedJoined,
    }),
  ];
};

export const readonlyPolicies = ({ tableName }: { tableName: string }) => [
  pg.pgPolicy(`${tableName}_select_policy`, {
    for: "select",
    to: [authenticatedUser],
    using: sql`true`,
  }),
  pg.pgPolicy(`${tableName}_insert_policy`, {
    for: "insert",
    to: [authenticatedUser],
    withCheck: sql`false`,
  }),
  pg.pgPolicy(`${tableName}_update_policy`, {
    for: "update",
    to: [authenticatedUser],
    using: sql`false`,
  }),
  pg.pgPolicy(`${tableName}_delete_policy`, {
    for: "delete",
    to: [authenticatedUser],
    using: sql`false`,
  }),
];

export const userBelongsToOrg = ({
  organizationId,
}: {
  organizationId: AnyPgColumn;
}) => sql`${organizationId} IN (
  SELECT organization_id FROM core.memberships
  WHERE user_id = auth.current_user_id()
)`;

const userIsOrgEditor = ({
  organizationId,
}: {
  organizationId: AnyPgColumn;
}) => sql`${organizationId} IN (
  SELECT m.organization_id FROM core.memberships m
  JOIN core.organizations o ON o.id = m.organization_id
  WHERE m.user_id = auth.current_user_id() AND m.role IN ('admin', 'accountant') AND o.deleted_at IS NULL
)`;

export const userIsOrgAdmin = ({
  organizationId,
}: {
  organizationId: AnyPgColumn;
}) => sql`${organizationId} IN (
  SELECT m.organization_id FROM core.memberships m
  JOIN core.organizations o ON o.id = m.organization_id
  WHERE m.user_id = auth.current_user_id() AND m.role = 'admin' AND o.deleted_at IS NULL
)`;
