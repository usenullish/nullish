export const INSERT_OMIT_FIELDS = {
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
} as const;

export const UPDATE_OMIT_FIELDS = {
  id: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const UPDATE_REQUIRED_FIELDS = { version: true } as const;

export const ORGANIZATION_ID_OMIT_FIELD = {
  organizationId: true,
} as const;
