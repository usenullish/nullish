import type { DbUserContextArgs } from "@usenullish/nullish-db";
import { ServiceContext } from "../../../_service/service";

export type InvitationServiceArgs = DbUserContextArgs & { token: string };

export abstract class InvitationService extends ServiceContext {
  readonly #token: string;

  protected constructor({ token, ...rest }: InvitationServiceArgs) {
    super(rest);

    this.#token = token;
  }

  protected get _token(): string {
    return this.#token;
  }
}
