import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { detectPantryItemsFromImages } from "../services/pantryVision.js";

export const pantryRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 6 },
});
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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

const scanBodySchema = z.object({
  householdId: z.string().uuid(),
  storageMethod: storageMethodEnum,
});

// Photo pantry intake, step 1: detect items from one or more photos of a
// single shelf. Nothing is saved here — per the project brief, a user must
// review/edit the list before anything is committed. See POST /confirm.
pantryRouter.post("/scan", upload.array("images", 6), async (req, res) => {
  const parsed = scanBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    return res.status(400).json({ error: "At least one image is required" });
  }
  for (const file of files) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({ error: `Unsupported image type: ${file.mimetype}` });
    }
  }

  try {
    const items = await detectPantryItemsFromImages(
      files.map((f) => ({
        base64: f.buffer.toString("base64"),
        mediaType: f.mimetype as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      })),
      parsed.data.storageMethod
    );
    res.json({ items });
  } catch (err) {
    console.error("Pantry photo scan failed:", err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Vision detection failed" });
  }
});

const confirmScanSchema = z.object({
  householdId: z.string().uuid(),
  storageMethod: storageMethodEnum,
  items: z
    .array(
      z.object({
        ingredientName: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().min(1),
      })
    )
    .min(1),
});

// Photo pantry intake, step 2: the user-reviewed/edited item list gets
// committed to the pantry here, with source=PHOTO for traceability.
pantryRouter.post("/confirm", async (req, res) => {
  const parsed = confirmScanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { householdId, storageMethod, items } = parsed.data;
  const created = await prisma.pantryItem.createMany({
    data: items.map((item) => ({
      householdId,
      ingredientName: item.ingredientName,
      quantity: item.quantity,
      unit: item.unit,
      storageMethod,
      purchaseDate: new Date(),
      source: "PHOTO" as const,
    })),
  });
  res.status(201).json({ created: created.count });
});
