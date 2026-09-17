// zodOutputFormat requires Zod v4 schema objects specifically — the rest of
// the app uses the regular "zod" (v3) import for request validation, but
// this schema needs the v4 compat entry point bundled with zod 3.25+.
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "../lib/anthropicClient.js";

const DetectedItemSchema = z.object({
  ingredientName: z.string(),
  estimatedQuantity: z.number(),
  unit: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  note: z.string().optional(),
});

const DetectionResultSchema = z.object({ items: z.array(DetectedItemSchema) });

export type DetectedPantryItem = z.infer<typeof DetectedItemSchema>;

type SupportedImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export type PantryPhoto = { base64: string; mediaType: SupportedImageMediaType };

/**
 * Sends one or more photos of a single fridge/freezer/pantry shelf to Claude
 * and asks it to list what it can actually see. Per the project brief, this
 * is intentionally a detect-only step — nothing is written to the pantry
 * until the caller shows the user a confirm/edit screen and posts the
 * reviewed list to the /pantry-items/confirm endpoint.
 */
export async function detectPantryItemsFromImages(
  images: PantryPhoto[],
  storageMethod: "FRIDGE" | "FREEZER" | "PANTRY"
): Promise<DetectedPantryItem[]> {
  const client = getAnthropicClient();

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    system:
      `You are a careful kitchen inventory assistant. You are shown one or more photos of a single ` +
      `household's ${storageMethod.toLowerCase()} shelf or zone. Identify each distinct food item you can ` +
      `actually see, estimating quantity and a practical unit (grams, milliliters, or a count for discrete ` +
      `items like eggs or onions). Only list items you can see in the photos — never guess at items that ` +
      `might plausibly be there but aren't visible. If a quantity is genuinely hard to judge, give your best ` +
      `estimate and mark confidence "low" rather than skipping the item.`,
    messages: [
      {
        role: "user",
        content: [
          ...images.map((img) => ({
            type: "image" as const,
            source: { type: "base64" as const, media_type: img.mediaType, data: img.base64 },
          })),
          { type: "text" as const, text: "List every distinct food item visible across these photos." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(DetectionResultSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Vision model response could not be parsed into the expected item list");
  }
  return response.parsed_output.items;
}
