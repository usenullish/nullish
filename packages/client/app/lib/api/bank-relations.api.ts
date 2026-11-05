import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import type { ApiBankRelationsWritableArgs } from "~/lib/api/_bank-relations";

export class ApiBankRelations extends AppApi {
  static create(): ApiBankRelations {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  update = async ({
    bankRelationId,
    body,
  }: {
    body: Api["BankRelations"]["Client"]["UpdateBankRelationBody"];
  } & ApiBankRelationsWritableArgs): Promise<
    Api["BankRelations"]["Client"]["UpdateBankRelationResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/banking/relations/${bankRelationId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.BankRelations.UpdateBankRelationRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot patch /banking/relations/${bankRelationId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.BankRelations.UpdateBankRelationResponseSchema.parse(result);
  };

  submit = async ({
    body,
    orgId,
  }: {
    body: Api["BankRelations"]["Client"]["CreateBankRelationBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["BankRelations"]["Client"]["CreateBankRelationResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/banking/relations`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.BankRelations.CreateBankRelationRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/banking/relations`,
      });
    }

    const result = await response.json();

    return ApiSchema.BankRelations.CreateBankRelationResponseSchema.parse(result);
  };

  importStatements = async ({
    bankRelationId,
    body: { file },
  }: {
    body: Api["BankRelations"]["Client"]["ImportStatementsBody"];
  } & ApiBankRelationsWritableArgs): Promise<
    Api["BankRelations"]["Client"]["ImportStatementsResponse"]
  > => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${this.apiUrl}/banking/relations/${bankRelationId}/statements/import`,
      {
        method: "POST",
        credentials: "include",
        body: formData,
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /banking/relations/${bankRelationId}/statements/import`,
      });
    }

    const result = await response.json();

    return ApiSchema.BankRelationsStatementsImport.ImportStatementsResponseSchema.parse(result);
  };

  delete = async ({ bankRelationId }: ApiBankRelationsWritableArgs): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/banking/relations/${bankRelationId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot delete /banking/relations/${bankRelationId}`,
      });
    }
  };
}
