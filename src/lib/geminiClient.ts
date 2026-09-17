import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

// Lazily constructed so the server can start (and non-AI routes can work)
// even before an API key is configured — the error only surfaces when an
// AI-backed route is actually called.
export function getGeminiClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get a free key (no credit card required) from " +
        "https://ai.google.dev/aistudio and add it to .env."
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

// Overridable via env since Google's model lineup moves faster than this
// codebase will — check https://ai.google.dev/gemini-api/docs/models for the
// current free-tier-eligible model if this default ever stops working.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
