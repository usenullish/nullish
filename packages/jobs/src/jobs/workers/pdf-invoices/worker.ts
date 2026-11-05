import type { Jobs } from "@usenullish/nullish-schema/jobs";
import type { Records } from "@usenullish/nullish-schema/records";
import { type InvoiceTemplateData } from "./_schema";
import { assertNonNullish, isNullish, nonNullish, type Result } from "@usenullish/nullish-common";
import { InvoiceStatus } from "@usenullish/nullish-schema/db";
import { withDbContext } from "../../../_db";
import { buildQrBill } from "./_helpers/qr-bill";
import { buildInvoiceTemplateData } from "./_data";
import { DEFAULT_TEMPLATES } from "./_templates";
import {
  DbClients,
  DbCollectionLines,
  DbInvoiceSummaries,
} from "@usenullish/nullish-engine/billing";
import {
  DbBankRelations,
  DbCurrencies,
  DbDocumentTemplates,
  DbOrganizations,
  DbTemplateContents,
  DbVatRates,
} from "@usenullish/nullish-engine/core";
import type { DbAdminContext } from "@usenullish/nullish-db";

type SelectTemplateContents = Records["Core"]["TemplateContents"]["Select"];
type Html = SelectTemplateContents["html"];
type Language = SelectTemplateContents["language"];
type OrganizationId = Records["Core"]["DocumentTemplates"]["Select"]["organizationId"];

interface Template {
  html: Html;
  language: Language;
}

export class PdfInvoicesWorker {
  readonly #userId: Jobs["PdfInvoices"]["Payload"]["userId"];
  readonly #invoiceId: Jobs["PdfInvoices"]["Payload"]["invoiceId"];
  readonly #template: Jobs["PdfInvoices"]["Template"];
  readonly #bankRelationId: Jobs["PdfInvoices"]["Payload"]["bankRelationId"];

  private constructor({
    payload: { userId, invoiceId, template, bankRelationId },
  }: {
    payload: Jobs["PdfInvoices"]["Payload"];
  }) {
    this.#userId = userId;
    this.#invoiceId = invoiceId;
    this.#template = template;
    this.#bankRelationId = bankRelationId;
  }

  static create(args: { payload: Jobs["PdfInvoices"]["Payload"] }): PdfInvoicesWorker {
    return new this(args);
  }

  async prepare(): Promise<{ html: Html; data: InvoiceTemplateData }> {
    const result = await withDbContext(async (dbContext) => {
      const summaryResult = await DbInvoiceSummaries.create({
        userId: this.#userId,
        db: dbContext.connection,
      }).find({ pKey: this.#invoiceId });

      if (summaryResult.status === "error") {
        return summaryResult;
      }

      const { result: summary } = summaryResult;

      assertNonNullish(
        summary,
        `Unexpected error while preparing PDF: Invoice (ID ${this.#invoiceId}) not found.`,
      );

      const { invoice, amounts } = summary;

      const templateResult = await this.#loadTemplate({
        dbContext,
        organizationId: invoice.organizationId,
      });

      if (templateResult.status === "error") {
        return templateResult;
      }

      const organizationResult = await DbOrganizations.create({
        userId: this.#userId,
        db: dbContext.connection,
      }).find({ pKey: invoice.organizationId });

      if (organizationResult.status === "error") {
        return organizationResult;
      }

      const clientResult = await DbClients.create({
        userId: this.#userId,
        db: dbContext.connection,
      }).find({ pKey: invoice.clientId });

      if (clientResult.status === "error") {
        return clientResult;
      }

      const currencyResult = await DbCurrencies.create({
        userId: this.#userId,
        db: dbContext.connection,
      }).find({ pKey: invoice.currency });

      if (currencyResult.status === "error") {
        return currencyResult;
      }

      const bankRelationResult = isNullish(this.#bankRelationId)
        ? { status: "success" as const, result: undefined }
        : await DbBankRelations.create({
            userId: this.#userId,
            db: dbContext.connection,
          }).find({ pKey: this.#bankRelationId });

      if (bankRelationResult.status === "error") {
        return bankRelationResult;
      }

      const linesResult = await DbCollectionLines.create({
        userId: this.#userId,
        db: dbContext.connection,
        foreignKeyId: invoice.id,
      }).listAll();

      if (linesResult.status === "error") {
        return linesResult;
      }

      const vatRateResult = isNullish(invoice.vatRateId)
        ? { status: "success" as const, result: undefined }
        : await DbVatRates.create({
            userId: this.#userId,
            db: dbContext.connection,
          }).find({ pKey: invoice.vatRateId });

      if (vatRateResult.status === "error") {
        return vatRateResult;
      }

      return {
        status: "success" as const,
        result: {
          invoice,
          amounts,
          template: templateResult.result,
          organization: organizationResult.result,
          client: clientResult.result,
          currency: currencyResult.result,
          bankRelation: bankRelationResult.result,
          lines: linesResult.result,
          vatRate: vatRateResult.result,
        },
      };
    });

    if (result.status === "error") {
      throw result.err;
    }

    const {
      invoice,
      amounts,
      template: { html, language },
      organization,
      client,
      currency,
      bankRelation,
      lines,
      vatRate,
    } = result.result;

    assertNonNullish(
      organization,
      `Unexpected error while preparing PDF: Organization (ID ${invoice.organizationId}) not found.`,
    );
    assertNonNullish(
      client,
      `Unexpected error while preparing PDF: Client (ID ${invoice.clientId}) not found.`,
    );
    assertNonNullish(
      currency,
      `Unexpected error while preparing PDF: Currency (code ${invoice.currency}) not found.`,
    );

    if (nonNullish(invoice.vatRateId)) {
      assertNonNullish(
        vatRate,
        `Unexpected error while preparing PDF: VAT rate (ID ${invoice.vatRateId}) not found.`,
      );
    }

    if (nonNullish(this.#bankRelationId)) {
      assertNonNullish(
        bankRelation,
        `Unexpected error while preparing PDF: Bank relation (ID ${this.#bankRelationId}) not found.`,
      );

      if (bankRelation.organizationId !== invoice.organizationId) {
        throw new Error(
          `Unexpected error while preparing PDF: Bank relation (ID ${this.#bankRelationId}) does not belong to the organization of invoice (ID ${this.#invoiceId}).`,
        );
      }
    }

    // We do not print QR-bill if the user does not pick a bank relation or if the invoice is a DRAFT.
    // The reason for the latter is the payment reference being set when the invoice is opened.
    const qrBill =
      isNullish(bankRelation) || invoice.status === InvoiceStatus.DRAFT
        ? null
        : buildQrBill({
            language,
            invoice,
            organization,
            client,
            bankRelation,
            currency,
            total: amounts.totals.total,
          });

    const templateData = buildInvoiceTemplateData({
      language,
      invoice,
      amounts,
      organization,
      client,
      bankRelation,
      currency,
      lines,
      vatRate,
      qrBill: qrBill?.svg,
    });

    return {
      html,
      data: templateData,
    };
  }

  async #loadTemplate({
    dbContext,
    organizationId,
  }: {
    dbContext: DbAdminContext;
    organizationId: OrganizationId;
  }): Promise<Result<Template>> {
    if (this.#template.type === "default") {
      const { language } = this.#template;
      return { status: "success", result: { html: DEFAULT_TEMPLATES[language], language } };
    }

    const { id } = this.#template;

    const templateContentResult = await DbTemplateContents.create({
      userId: this.#userId,
      db: dbContext.connection,
    }).find({ pKey: id });

    if (templateContentResult.status === "error") {
      return templateContentResult;
    }

    const { result: content } = templateContentResult;

    assertNonNullish(
      content,
      `Unexpected error while preparing PDF: Template content (ID ${id}) not found.`,
    );

    // We load the document as well to ensure the organization of the template matches the one of the invoice
    const templateDocumentResult = await DbDocumentTemplates.create({
      userId: this.#userId,
      db: dbContext.connection,
    }).find({ pKey: content.templateId });

    if (templateDocumentResult.status === "error") {
      return templateDocumentResult;
    }

    const { result: document } = templateDocumentResult;

    assertNonNullish(
      document,
      `Unexpected error while preparing PDF: Document for template (ID ${content.templateId}) not found.`,
    );

    if (document.organizationId !== organizationId) {
      throw new Error(
        `Unexpected error while preparing PDF: Template (ID ${content.templateId}) does not belong to the organization of invoice (ID ${this.#invoiceId}).`,
      );
    }

    return { status: "success", result: { html: content.html, language: content.language } };
  }
}
