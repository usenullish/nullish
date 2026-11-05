import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";

interface ApiWithBankMovementIdArgs {
  bankMovementId: Api["BankMovements"]["Client"]["BankMovement"]["id"];
}

export class ApiBankMovements extends AppApi {
  static create(): ApiBankMovements {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  reconcile = async ({
    bankMovementId,
    body,
  }: {
    body: Api["BankMovements"]["Client"]["ReconcileBankMovementBody"];
  } & ApiWithBankMovementIdArgs): Promise<
    Api["BankMovements"]["Client"]["ReconcileBankMovementResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/banking/movements/${bankMovementId}/reconcile`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.BankMovementsReconcile.ReconcileBankMovementRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /banking/movements/${bankMovementId}/reconcile`,
      });
    }

    const result = await response.json();

    return ApiSchema.BankMovementsReconcile.ReconcileBankMovementResponseSchema.parse(result);
  };

  ignore = async ({
    bankMovementId,
  }: ApiWithBankMovementIdArgs): Promise<
    Api["BankMovements"]["Client"]["IgnoreBankMovementResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/banking/movements/${bankMovementId}/ignore`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /banking/movements/${bankMovementId}/ignore`,
      });
    }

    const result = await response.json();

    return ApiSchema.BankMovementsIgnore.IgnoreBankMovementResponseSchema.parse(result);
  };
}
