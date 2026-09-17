import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const pantryRouter = Router();

const storageMethodEnum = z.enum(["FRIDGE", "FREEZER", "PANTRY"]);
const itemSourceEnum = z.enum(["PHOTO", "GROCERY_LIST", "MANUAL"]);

const createPantryItemSchema = z.object({
  householdId: z.string().uuid(),
  ingredientName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  storageMethod: storageMethodEnum,
  purchaseDate: z.coerce.date().optional(),
  estimatedExpiryDate: z.coerce.date().optional(),
  source: itemSourceEnum.default("MANUAL"),
});

const updatePantryItemSchema = createPantryItemSchema.partial().omit({ householdId: true });

// List pantry items for a household, soonest-expiring first — this is the
// order the app should nudge a user to use things up in.
pantryRouter.get("/", async (req, res) => {
  const householdId = req.query.householdId;
  if (typeof householdId !== "string") {
    return res.status(400).json({ error: "householdId query param is required" });
  }
  const items = await prisma.pantryItem.findMany({
    where: { householdId },
    orderBy: [{ estimatedExpiryDate: "asc" }, { createdAt: "desc" }],
  });
  res.json(items);
});

pantryRouter.post("/", async (req, res) => {
  const parsed = createPantryItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const item = await prisma.pantryItem.create({ data: parsed.data });
  res.status(201).json(item);
});

pantryRouter.patch("/:id", async (req, res) => {
  const parsed = updatePantryItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const item = await prisma.pantryItem.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(item);
  } catch {
    res.status(404).json({ error: "Pantry item not found" });
  }
});

pantryRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.pantryItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Pantry item not found" });
  }
});
