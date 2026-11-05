import puppeteer, { type Browser, type HTTPRequest, type Page } from "puppeteer";
import { join } from "node:path";
import { isNullish, type Nullish } from "@usenullish/nullish-common";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";

export class PdfGenerator {
  static #instance: Nullish<Promise<PdfGenerator>>;

  readonly #browser: Browser;

  private constructor({ browser }: { browser: Browser }) {
    this.#browser = browser;
  }

  static async create(): Promise<PdfGenerator> {
    if (isNullish(PdfGenerator.#instance)) {
      PdfGenerator.#instance = PdfGenerator.#initInstance();
    }

    try {
      return await PdfGenerator.#instance;
    } catch (error: unknown) {
      PdfGenerator.#instance = null;
      throw error;
    }
  }

  static async #initInstance(): Promise<PdfGenerator> {
    const browser = await PdfGenerator.#initBrowser();

    // Reset the static instance automatically if Chromium crashes or terminates
    browser.once("disconnected", () => {
      PdfGenerator.#instance = null;
    });

    return new PdfGenerator({ browser });
  }

  static async #initBrowser(): Promise<Browser> {
    return await puppeteer.launch({
      headless: true,
      args: [
        // Core Sandbox Bypasses (Isolated by Non-Root Docker Container)
        "--no-sandbox", // Required to overcome running Puppeteer in Docker. No usable sandbox! If this is a Debian system, please install the chromium-sandbox package to solve this problem. If you are running on Ubuntu 23.10+ or another Linux distro that has disabled unprivileged user namespaces with AppArmor, see https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md. If you want to live dangerously and need an immediate workaround, you can try using --no-sandbox.
        "--disable-setuid-sandbox", // Disables the secondary SUID-based sandbox helper

        // Memory & Performance Hardening
        "--disable-dev-shm-usage", // Prevents resource exhaustion in Docker (/dev/shm)
        "--disable-gpu", // Disables hardware acceleration (reduces exploit surface)
        "--mute-audio", // Mutes any audio playback
        "--no-first-run", // Skips first-run welcome screens

        // Attack Surface Reduction
        "--disable-extensions", // Blocks malicious or unverified extensions
        "--disable-notifications", // Blocks push notification prompts
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync", // Disables Google account syncing
      ],
    });
  }

  async render({
    html,
    output: { path: outputFilepath, filename: outputFilename },
  }: {
    html: string;
    output: { path: string; filename: `${string}.pdf` };
  }) {
    const page = await this.#createPage();

    try {
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      const stream = await page.createPDFStream({
        format: "A4",
        printBackground: true,
      });

      const storage = FsStorageProvider.create();

      await storage.put({
        key: join(outputFilepath, outputFilename),
        body: stream,
      });
    } finally {
      await page.close();
    }
  }

  async #createPage(): Promise<Page> {
    const page = await this.#browser.newPage();

    // Disallow JavaScript execution
    await page.setJavaScriptEnabled(false);

    const interceptAndDenyRequests = async () => {
      await page.setRequestInterception(true);

      page.on("request", (req: HTTPRequest) => {
        return req.abort();
      });
    };

    // Deny any requests. Templates must be 100% self-contained.
    await interceptAndDenyRequests();

    return page;
  }
}
