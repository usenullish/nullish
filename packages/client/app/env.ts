import { API_PATH } from "@usenullish/nullish-schema/server";

export const API_URL = import.meta.env.SSR ? process.env.NULLISH_API_URL : API_PATH;
export const ENVIRONMENT = import.meta.env.SSR ? process.env.NULLISH_ENVIRONMENT : undefined;
export const TERMS_URL = import.meta.env.SSR ? process.env.NULLISH_TERMS_URL : undefined;
export const PRIVACY_URL = import.meta.env.SSR ? process.env.NULLISH_PRIVACY_URL : undefined;
