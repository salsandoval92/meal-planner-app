import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

// Lazily constructed so the server can start (and non-AI routes can work)
// even before an API key is configured — the error only surfaces when an
// AI-backed route is actually called.
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Get a key from https://console.anthropic.com/settings/keys and add it to .env."
    );
  }
  if (!client) {
    client = new Anthropic();
  }
  return client;
}
