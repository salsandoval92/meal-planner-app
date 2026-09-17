import type { Content, FunctionCall, Part } from "@google/genai";
import { createPartFromFunctionResponse } from "@google/genai";
import { getGeminiClient, GEMINI_MODEL } from "../lib/geminiClient.js";

const UPDATE_PROFILE_FUNCTION_DECLARATION = {
  name: "update_household_profile",
  description:
    "Save or update the household's profile as new information is confirmed in the conversation. " +
    "Call this every time the user gives you a new fact — you can call it many times over the " +
    "conversation, not just once at the end. Only include fields that are new or have changed; " +
    "omit anything not yet known.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      region: {
        type: "string",
        description: "Country/region code or name, e.g. 'US-TX' or 'UAE' — used for shelf-life and pricing.",
      },
      budgetTarget: {
        type: "number",
        description: "Weekly grocery budget target, in the household's local currency.",
      },
      cuisinePreferences: { type: "array", items: { type: "string" } },
      preferredStores: {
        type: "array",
        items: { type: "string" },
        description: "Grocery store names the household shops at, e.g. 'HEB', 'Spinneys'.",
      },
      kitchenEquipment: {
        type: "array",
        items: { type: "string" },
        description: "e.g. 'oven', 'air fryer', 'instant pot', 'slow cooker'.",
      },
      calorieTargetPerServing: {
        type: "integer",
        description: "A rough target calories per meal serving, if the household cares about this.",
      },
      members: {
        type: "array",
        description:
          "The full, current list of household members known so far — always send everyone you " +
          "know about, not just newly-added people, since this replaces the stored list.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "integer" },
            allergies: { type: "array", items: { type: "string" } },
            dietaryTags: {
              type: "array",
              items: { type: "string" },
              description: "e.g. 'vegetarian', 'halal', 'low-carb', 'trying to eat more protein'.",
            },
          },
          required: ["name"],
        },
      },
      onboardingComplete: {
        type: "boolean",
        description:
          "Set true once you have at least: region, one household member, cuisine preferences, and a " +
          "budget target — enough to generate a useful first meal plan.",
      },
    },
  },
};

const SYSTEM_INSTRUCTION = `You are a friendly onboarding assistant for a meal-planning app whose main goal is reducing household food waste.

Have a natural, short-turn conversation — one or two questions at a time, never a long form — to learn:
- who's in the household, their ages, allergies, and dietary restrictions or goals
- cuisines they enjoy
- kitchen equipment they have available
- preferred grocery stores and their region/location (used for regional pricing and shelf-life estimates)
- a weekly grocery budget target
- a rough calorie target per serving, if they have one in mind (skip it if they don't care)

Whenever the user confirms a piece of information, call update_household_profile right away to save it — don't wait until the end of the conversation. Keep your spoken replies warm and brief.

Once you have at least region, one household member, cuisine preferences, and a budget target, call update_household_profile with onboardingComplete: true in the same turn, and wrap up warmly — mention they can add more detail later, and that the next step is photographing their pantry shelves.`;

export type OnboardingTurnResult = {
  reply: string;
  profileUpdates: Record<string, unknown>[];
};

/**
 * Runs one turn of the onboarding conversation: sends the user's message
 * plus prior history to Gemini, applies any update_household_profile
 * function calls via `applyUpdate` (writing straight to the database), and
 * returns once the model produces its next spoken reply.
 */
export async function continueOnboardingChat(
  history: Content[],
  userMessage: string,
  applyUpdate: (update: Record<string, unknown>) => Promise<void>
): Promise<OnboardingTurnResult> {
  const client = getGeminiClient();
  const contents: Content[] = [...history, { role: "user", parts: [{ text: userMessage }] }];
  const profileUpdates: Record<string, unknown>[] = [];

  const MAX_TOOL_ITERATIONS = 4;
  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [UPDATE_PROFILE_FUNCTION_DECLARATION] }],
      },
    });

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) {
      contents.push({ role: "model", parts: modelContent.parts ?? [] });
    }

    const functionCalls: FunctionCall[] = response.functionCalls ?? [];

    if (functionCalls.length === 0) {
      return { reply: response.text ?? "", profileUpdates };
    }

    const responseParts: Part[] = [];
    for (const call of functionCalls) {
      const update = (call.args ?? {}) as Record<string, unknown>;
      await applyUpdate(update);
      profileUpdates.push(update);
      responseParts.push(createPartFromFunctionResponse(call.id ?? call.name ?? "update_household_profile", call.name ?? "update_household_profile", { status: "saved" }));
    }
    contents.push({ role: "user", parts: responseParts });
  }

  throw new Error("Onboarding assistant did not finish responding after several tool calls");
}
