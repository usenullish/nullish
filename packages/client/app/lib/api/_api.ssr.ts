import { Api } from "~/lib/api/_api";

export abstract class ApiSsr extends Api {
  readonly #cookie: string;

  protected constructor({ apiUrl, cookie }: { apiUrl: string; cookie: string }) {
    super({ apiUrl });
    this.#cookie = cookie;
  }

  cookieHeader(): { cookie: string } {
    return { cookie: this.#cookie };
  }
}
