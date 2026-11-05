// Base class for the business errors raised by the engine (invalid invoice status, missing VAT
// settings, unsupported currency, etc.). Their messages are meant to be exposed to the caller,
// unlike unexpected errors (e.g. database errors) which should not leak.
export class EngineError extends Error {}
