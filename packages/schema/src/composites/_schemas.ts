import * as JournalSchema from "./schemas/journal";
import * as JournalSummariesSchema from "./schemas/journal-summaries";
import * as InvoiceSummariesSchema from "./schemas/invoice-summaries";
import * as BankRelationSummariesSchema from "./schemas/bank-relation-summaries";
import * as MovementSummariesSchema from "./schemas/movement-summaries";
import * as ChatSchema from "./schemas/chat";

const CompositesSchema = {
  JournalSchema,
  JournalSummariesSchema,
  InvoiceSummariesSchema,
  BankRelationSummariesSchema,
  MovementSummariesSchema,
  ChatSchema,
};

export { CompositesSchema };
