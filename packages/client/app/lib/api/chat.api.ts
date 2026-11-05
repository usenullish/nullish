import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString, isNullish } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";

export class ApiChat extends AppApi {
  static create(): ApiChat {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  stream = ({
    body,
  }: {
    body: Api["Chat"]["Client"]["ChatRequest"];
  }): AsyncGenerator<Api["Chat"]["Client"]["ChatEvent"]> => this.#stream({ body });

  async *#stream({
    body,
  }: {
    body: Api["Chat"]["Client"]["ChatRequest"];
  }): AsyncGenerator<Api["Chat"]["Client"]["ChatEvent"]> {
    const response = await fetch(`${this.apiUrl}/chat`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Chat.ChatRequestSchema,
        body,
      }),
    });

    if (!response.ok || isNullish(response.body)) {
      return await this.throwError({
        response,
        message: "Cannot post /chat",
      });
    }

    // Server-sent events are separated by a blank line, and a chunk of the stream can end in the
    // middle of an event
    let buffer = "";

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += value;

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const data = event
          .split("\n")
          .filter((line) => line.startsWith("data: "))
          .map((line) => line.slice("data: ".length))
          .join("\n");

        if (data !== "") {
          yield ApiSchema.Chat.ChatEventSchema.parse(JSON.parse(data));
        }
      }
    }
  }
}
