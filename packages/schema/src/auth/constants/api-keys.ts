export enum ApiKeyResource {
  MCP = "mcp",
  API = "api",
}

export enum ApiKeyAction {
  READ = "read",
  WRITE = "write",
}

export const API_KEY_DEFAULT_EXPIRATION_DAYS = 7;
export const API_KEY_MAX_EXPIRATION_DAYS = 365;
