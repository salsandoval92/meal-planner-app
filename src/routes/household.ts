import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const householdRouter = Router();

const memberSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive().optional(),
  allergies: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),
});

const createHouseholdSchema = z.object({
  name: z.string().min(1),
  region: z.string().min(1),
  budgetTarget: z.number().positive().optional(),
  members: z.array(memberSchema).default([]),
});

householdRouter.get("/", async (_req, res) => {
  const households = await prisma.household.findMany({
    include: { members: true },
  });
  res.json(households);
});

householdRouter.get("/:id", async (req, res) => {
  const household = await prisma.household.findUnique({
    where: { id: req.params.id },
    include: { members: true },
  });
  if (!household) return res.status(404).json({ error: "Household not found" });
  res.json(household);
});

householdRouter.post("/", async (req, res) => {
  const parsed = createHouseholdSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { members, ...householdData } = parsed.data;
  const household = await prisma.household.create({
    data: {
      ...householdData,
      members: { create: members },
    },
    include: { members: true },
  });
  res.status(201).json(household);
});
