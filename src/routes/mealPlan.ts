import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { generateWeeklyMealPlan, type CandidateRecipe } from "../services/mealPlanGenerator.js";

export const mealPlanRouter = Router();

const generateSchema = z.object({
  householdId: z.string().uuid(),
  weekStart: z.coerce.date(),
  recipesPerWeek: z.number().int().min(1).max(10).default(5),
});

mealPlanRouter.get("/", async (req, res) => {
  const householdId = req.query.householdId;
  if (typeof householdId !== "string") {
    return res.status(400).json({ error: "householdId query param is required" });
  }
  const plans = await prisma.mealPlan.findMany({
    where: { householdId },
    orderBy: { weekStart: "desc" },
    include: { recipes: { include: { recipe: true } }, groceryList: true },
  });
  res.json(plans);
});

// Generates a weekly meal plan from the household's pantry + the recipe
// catalog, prioritizing recipes that share ingredients and use up
// near-expiry pantry items. This is the "mocked AI" step described in the
// project brief: a real integration would ask an AI model for a larger,
// personalized pool of candidate recipes and pass them into the same
// generateWeeklyMealPlan() selection logic.
mealPlanRouter.post("/generate", async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { householdId, weekStart, recipesPerWeek } = parsed.data;

  const [pantryItems, recipes] = await Promise.all([
    prisma.pantryItem.findMany({ where: { householdId } }),
    prisma.recipe.findMany(),
  ]);

  if (recipes.length < recipesPerWeek) {
    return res.status(400).json({
      error: `Recipe catalog has ${recipes.length} recipes, need at least ${recipesPerWeek}. Run the seed script.`,
    });
  }

  const candidates: CandidateRecipe[] = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    ingredients: r.ingredients as { name: string; quantity: number; unit: string }[],
  }));

  const pantryInputs = pantryItems.map((item) => ({
    ingredientName: item.ingredientName,
    quantity: Number(item.quantity),
    unit: item.unit,
    estimatedExpiryDate: item.estimatedExpiryDate,
  }));

  const selection = generateWeeklyMealPlan(candidates, pantryInputs, { recipesPerWeek });

  const mealPlan = await prisma.mealPlan.create({
    data: {
      householdId,
      weekStart,
      wasteScore: selection.wasteScore,
      recipes: {
        create: selection.recipes.map((r) => ({ recipeId: r.id })),
      },
      groceryList: {
        create: selection.groceryList.map((item) => ({
          ingredientName: item.ingredientName,
          quantityNeeded: item.quantity,
          unit: item.unit,
        })),
      },
    },
    include: { recipes: { include: { recipe: true } }, groceryList: true },
  });

  res.status(201).json({
    ...mealPlan,
    usedNearExpiryIngredients: selection.usedNearExpiryIngredients,
  });
});

// Mark a recipe in a plan as cooked, and decrement its ingredients from the
// pantry (full recipe amounts — see project brief for the simple-vs-granular
// tradeoff on this).
mealPlanRouter.post("/:mealPlanId/recipes/:mealPlanRecipeId/cook", async (req, res) => {
  const { mealPlanRecipeId } = req.params;

  const mealPlanRecipe = await prisma.mealPlanRecipe.findUnique({
    where: { id: mealPlanRecipeId },
    include: { recipe: true, mealPlan: true },
  });
  if (!mealPlanRecipe) {
    return res.status(404).json({ error: "Meal plan recipe not found" });
  }

  const ingredients = mealPlanRecipe.recipe.ingredients as {
    name: string;
    quantity: number;
    unit: string;
  }[];
  const householdId = mealPlanRecipe.mealPlan.householdId;

  await prisma.$transaction(async (tx) => {
    for (const ingredient of ingredients) {
      const pantryItem = await tx.pantryItem.findFirst({
        where: {
          householdId,
          ingredientName: { equals: ingredient.name, mode: "insensitive" },
        },
        orderBy: { estimatedExpiryDate: "asc" },
      });
      if (!pantryItem) continue;
      const remaining = Number(pantryItem.quantity) - ingredient.quantity;
      if (remaining <= 0) {
        await tx.pantryItem.delete({ where: { id: pantryItem.id } });
      } else {
        await tx.pantryItem.update({
          where: { id: pantryItem.id },
          data: { quantity: remaining },
        });
      }
    }
    await tx.mealPlanRecipe.update({
      where: { id: mealPlanRecipeId },
      data: { cooked: true, cookedAt: new Date() },
    });
  });

  res.json({ ok: true });
});
