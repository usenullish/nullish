// TODO: extract a project constant for /api - we have few duplication
export const API_URL = import.meta.env.SSR ? process.env.NULLISH_API_URL : "/api";
export const ENVIRONMENT = import.meta.env.SSR ? process.env.NULLISH_ENVIRONMENT : undefined;
