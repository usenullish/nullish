import { JobsExportService } from "@usenullish/nullish-engine/core";
import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { ApiSchema, CommonSchema } from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { WRITE_TOOL, READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

type ExportsArgs = DbStoreInitArgs & { jobs: TriggerJobs };

export class McpToolsExports extends McpTools<ExportsArgs> {
  private constructor(args: McpToolsInitArgs<ExportsArgs>) {
    super(args);
  }

  static create(args: McpToolsInitArgs<ExportsArgs>): McpToolsExports {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerGetOrganizationExportJob();
  }

  override registerWriteTools() {
    this.#registerGenerateOrganizationExport();
  }

  #registerGenerateOrganizationExport() {
    this.registerTool({
      title: "generate_organization_export",
      annotations: WRITE_TOOL,
      description:
        "Queues the export of the data of an organization, one JSON file per table in a tar.gz archive. Returns a job whose state can be followed with get_organization_export_job.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Exports.GenerateExportResponseSchema),
      fn: async ({ organizationId }) => {
        const result = await JobsExportService.create({ ...this._args, organizationId }).generate();

        return this.mapResult(result, (job) => ({ status: "queued" as const, ...job }));
      },
    });
  }

  #registerGetOrganizationExportJob() {
    this.registerTool({
      title: "get_organization_export_job",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the state of an export job of an organization. Once completed, the archive can be downloaded for a while at /organizations/{organizationId}/exports/{exportId}/download.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        jobId: CommonSchema.Params.RouteIdParamsSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Exports.ExportJobStateResponseSchema),
      fn: async ({ organizationId, jobId }) => {
        return await JobsExportService.create({ ...this._args, organizationId }).jobState({
          jobId,
        });
      },
    });
  }
}
