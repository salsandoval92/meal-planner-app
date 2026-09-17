import { Router } from "express";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../lib/prisma.js";
import { continueOnboardingChat } from "../services/onboardingAssistant.js";

export const onboardingRouter = Router();

// Creates a blank household to onboard, and returns its id. The chat then
// fills in the rest of the profile via update_household_profile tool calls.
onboardingRouter.post("/start", async (req, res) => {
  const name =
    typeof req.body?.name === "string" && req.body.name.trim() ? req.body.name.trim() : "New Household";
  const household = await prisma.household.create({ data: { name, region: "" } });
  res.status(201).json({ household });
});

onboardingRouter.get("/:householdId/messages", async (req, res) => {
  const messages = await prisma.onboardingMessage.findMany({
    where: { householdId: req.params.householdId },
    orderBy: { createdAt: "asc" },
  });
  res.json(messages);
});

const messageSchema = z.object({ message: z.string().min(1) });

onboardingRouter.post("/:householdId/messages", async (req, res) => {
  const { householdId } = req.params;
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const household = await prisma.household.findUnique({ where: { id: householdId } });
  if (!household) {
    return res.status(404).json({ error: "Household not found" });
  }

  const priorMessages = await prisma.onboardingMessage.findMany({
    where: { householdId },
    orderBy: { createdAt: "asc" },
  });
  const history: Anthropic.MessageParam[] = priorMessages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  await prisma.onboardingMessage.create({
    data: { householdId, role: "user", content: parsed.data.message },
  });

  let onboardingComplete = false;

  try {
    const result = await continueOnboardingChat(history, parsed.data.message, async (update) => {
      const data: Record<string, unknown> = {};
      if (typeof update.region === "string") data.region = update.region;
      if (typeof update.budgetTarget === "number") data.budgetTarget = update.budgetTarget;
      if (Array.isArray(update.cuisinePreferences)) data.cuisinePreferences = update.cuisinePreferences;
      if (Array.isArray(update.preferredStores)) data.preferredStores = update.preferredStores;
      if (Array.isArray(update.kitchenEquipment)) data.kitchenEquipment = update.kitchenEquipment;
      if (typeof update.calorieTargetPerServing === "number") {
        data.calorieTargetPerServing = Math.round(update.calorieTargetPerServing);
      }
      if (typeof update.onboardingComplete === "boolean") {
        data.onboardingComplete = update.onboardingComplete;
        onboardingComplete = update.onboardingComplete;
      }

      if (Object.keys(data).length > 0) {
        await prisma.household.update({ where: { id: householdId }, data });
      }

      if (Array.isArray(update.members)) {
        const members = update.members as Array<{
          name: unknown;
          age?: unknown;
          allergies?: unknown;
          dietaryTags?: unknown;
        }>;
        // The assistant is instructed to always send the full known member
        // list, so replacing wholesale is correct here (not additive).
        await prisma.$transaction([
          prisma.householdMember.deleteMany({ where: { householdId } }),
          prisma.householdMember.createMany({
            data: members
              .filter((m) => typeof m.name === "string" && m.name.length > 0)
              .map((m) => ({
                householdId,
                name: m.name as string,
                age: typeof m.age === "number" ? m.age : undefined,
                allergies: Array.isArray(m.allergies) ? (m.allergies as string[]) : [],
                dietaryTags: Array.isArray(m.dietaryTags) ? (m.dietaryTags as string[]) : [],
              })),
          }),
        ]);
      }
    });

    await prisma.onboardingMessage.create({
      data: { householdId, role: "assistant", content: result.reply },
    });

    const updatedHousehold = await prisma.household.findUnique({
      where: { id: householdId },
      include: { members: true },
    });

    res.json({ reply: result.reply, household: updatedHousehold, done: onboardingComplete });
  } catch (err) {
    console.error("Onboarding chat turn failed:", err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Onboarding assistant failed" });
  }
});
