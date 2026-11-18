import type { App } from "../../types/app";

export interface WebhookArgs {
  path: `/${string}`;
  app: App;
}

type WebhookCreateArgs = Omit<WebhookArgs, "path">;

type WebhookFactory<Args extends WebhookCreateArgs> = (args: Args) => Webhook;

export interface WebhookClass<Args extends WebhookCreateArgs = WebhookCreateArgs> {
  create: WebhookFactory<Args>;
}

export function WebhookProvider<Args extends WebhookCreateArgs>(_constructor: WebhookClass<Args>) {}

export abstract class Webhook {
  readonly #path: WebhookArgs["path"];
  readonly #app: App;

  protected constructor({ path, app }: WebhookArgs) {
    this.#path = path;
    this.#app = app;
  }

  protected get path(): WebhookArgs["path"] {
    return this.#path;
  }

  protected get app(): App {
    return this.#app;
  }

  abstract register(): void;
}
