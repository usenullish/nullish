import type { Params } from "react-router";
import type { I18n } from "~/kit/i18n/i18n";
import type { Api } from "@usenullish/nullish-schema/server";

export interface BreadcrumbHandle {
  breadcrumb: {
    back: (params: {
      organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
      params: Params;
    }) => string;
    label: (params: { i18n: I18n }) => string;
  };
}

export const isBreadcrumbHandle = (handle: unknown): handle is BreadcrumbHandle =>
  typeof handle === "object" && handle !== null && "breadcrumb" in handle;

// Permissions are defined with RLS but, it's for user friendly-ness we avoid e.g. to show a /new page
// if the user (a reviewer) cannot create new data anyway.
export interface PermissionHandle {
  permission: {
    write: true;
  };
}

export interface RouteHandle extends BreadcrumbHandle, PermissionHandle {}

export const isPermissionHandle = (handle: unknown): handle is PermissionHandle =>
  typeof handle === "object" &&
  handle !== null &&
  "permission" in handle &&
  typeof handle.permission === "object" &&
  handle.permission !== null;
