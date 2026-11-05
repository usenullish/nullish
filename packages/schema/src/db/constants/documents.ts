export enum DocumentType {
  INVOICE = "invoice",
}

// TODO: the list of languages also exist in the client. We should likely refactor it though not sure where?
// Note: client cannot use env (process.env...)
export enum DefaultTemplateLanguage {
  EN = "en",
  FR = "fr",
  DE = "de",
  IT = "it",
}
