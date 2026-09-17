import { getGeminiClient, GEMINI_MODEL } from "../lib/geminiClient.js";

export type DetectedPantryItem = {
  ingredientName: string;
  estimatedQuantity: number;
  unit: string;
  confidence: "high" | "medium" | "low";
  note?: string;
};

type SupportedImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export type PantryPhoto = { base64: string; mediaType: SupportedImageMediaType };

const DETECTION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ingredientName: { type: "string" },
          estimatedQuantity: { type: "number" },
          unit: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          note: { type: "string" },
        },
        required: ["ingredientName", "estimatedQuantity", "unit", "confidence"],
      },
    },
  },
  required: ["items"],
};

/**
 * Sends one or more photos of a single fridge/freezer/pantry shelf to
 * Gemini and asks it to list what it can actually see. Per the project
 * brief, this is intentionally a detect-only step — nothing is written to
 * the pantry until the caller shows the user a confirm/edit screen and
 * posts the reviewed list to the /pantry-items/confirm endpoint.
 */
export async function detectPantryItemsFromImages(
  images: PantryPhoto[],
  storageMethod: "FRIDGE" | "FREEZER" | "PANTRY"
): Promise<DetectedPantryItem[]> {
  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          ...images.map((img) => ({
            inlineData: { data: img.base64, mimeType: img.mediaType },
          })),
          {
            text:
              `You are a careful kitchen inventory assistant. You are shown one or more photos of a single ` +
              `household's ${storageMethod.toLowerCase()} shelf or zone. Identify each distinct food item you can ` +
              `actually see, estimating quantity and a practical unit (grams, milliliters, or a count for discrete ` +
              `items like eggs or onions). Only list items you can see in the photos — never guess at items that ` +
              `might plausibly be there but aren't visible. If a quantity is genuinely hard to judge, give your ` +
              `best estimate and mark confidence "low" rather than skipping the item. List every distinct food ` +
              `item visible across these photos.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: DETECTION_RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Vision model returned no output");
  }

  let parsed: { items: DetectedPantryItem[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Vision model response could not be parsed into the expected item list");
  }
  return parsed.items;
}
