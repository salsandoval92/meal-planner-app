// Mocked meal-plan generator: demonstrates the core waste-reduction logic
// (pick a *set* of recipes that share ingredients and use up near-expiry
// pantry items) without calling a real AI model. In production, an AI model
// would propose a larger pool of candidate recipes tailored to the
// household's preferences; this scoring/selection step stays the same.

export type RecipeIngredient = { name: string; quantity: number; unit: string };

export type CandidateRecipe = {
  id: string;
  title: string;
  ingredients: RecipeIngredient[];
};

export type PantryItemInput = {
  ingredientName: string;
  quantity: number;
  unit: string;
  estimatedExpiryDate?: Date | null;
};

export type MealPlanSelection = {
  recipes: CandidateRecipe[];
  wasteScore: number; // 0-100, higher = better ingredient reuse / expiry coverage
  usedNearExpiryIngredients: string[];
  groceryList: { ingredientName: string; quantity: number; unit: string }[];
};

const NEAR_EXPIRY_DAYS = 5;

function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function normalizedName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Scores a combination of recipes by two things that matter for waste
 * reduction: how many ingredients repeat across recipes (shared shopping,
 * fewer odd leftovers) and how many near-expiry pantry items get used up.
 */
function scoreCombination(
  combo: CandidateRecipe[],
  nearExpiryIngredients: Set<string>
): number {
  const ingredientCounts = new Map<string, number>();
  for (const recipe of combo) {
    const seenInRecipe = new Set<string>();
    for (const ingredient of recipe.ingredients) {
      const key = normalizedName(ingredient.name);
      if (seenInRecipe.has(key)) continue; // count each recipe once per ingredient
      seenInRecipe.add(key);
      ingredientCounts.set(key, (ingredientCounts.get(key) ?? 0) + 1);
    }
  }

  const totalIngredientSlots = [...ingredientCounts.values()].reduce((a, b) => a + b, 0);
  const uniqueIngredients = ingredientCounts.size;
  // Overlap ratio: 1.0 if every ingredient were reused in every recipe, closer
  // to 1/recipeCount if nothing overlaps at all.
  const overlapRatio = totalIngredientSlots > 0 ? uniqueIngredients / totalIngredientSlots : 0;
  const overlapScore = (1 - overlapRatio) * 100; // fewer unique ingredients relative to slots = higher score

  const usedNearExpiry = [...ingredientCounts.keys()].filter((name) =>
    nearExpiryIngredients.has(name)
  ).length;
  const expiryScore =
    nearExpiryIngredients.size > 0
      ? (usedNearExpiry / nearExpiryIngredients.size) * 100
      : 100;

  // Weight near-expiry usage higher: burning down food that's about to spoil
  // is the whole point of the app.
  return expiryScore * 0.6 + overlapScore * 0.4;
}

function* combinations<T>(items: T[], size: number): Generator<T[]> {
  if (size === 0) {
    yield [];
    return;
  }
  for (let i = 0; i <= items.length - size; i++) {
    for (const rest of combinations(items.slice(i + 1), size - 1)) {
      yield [items[i], ...rest];
    }
  }
}

export function generateWeeklyMealPlan(
  candidateRecipes: CandidateRecipe[],
  pantryItems: PantryItemInput[],
  options: { recipesPerWeek?: number; now?: Date } = {}
): MealPlanSelection {
  const recipesPerWeek = options.recipesPerWeek ?? 5;
  const now = options.now ?? new Date();

  if (candidateRecipes.length < recipesPerWeek) {
    throw new Error(
      `Need at least ${recipesPerWeek} candidate recipes, got ${candidateRecipes.length}`
    );
  }

  const nearExpiryIngredients = new Set(
    pantryItems
      .filter(
        (item) =>
          item.estimatedExpiryDate &&
          daysUntil(item.estimatedExpiryDate, now) <= NEAR_EXPIRY_DAYS
      )
      .map((item) => normalizedName(item.ingredientName))
  );

  let best: { combo: CandidateRecipe[]; score: number } | null = null;
  for (const combo of combinations(candidateRecipes, recipesPerWeek)) {
    const score = scoreCombination(combo, nearExpiryIngredients);
    if (!best || score > best.score) {
      best = { combo, score };
    }
  }

  // best is guaranteed non-null: we already checked candidateRecipes.length >= recipesPerWeek
  const { combo, score } = best!;

  const pantryByIngredient = new Map<string, number>();
  for (const item of pantryItems) {
    const key = normalizedName(item.ingredientName);
    pantryByIngredient.set(key, (pantryByIngredient.get(key) ?? 0) + item.quantity);
  }

  const neededTotals = new Map<string, { quantity: number; unit: string }>();
  for (const recipe of combo) {
    for (const ingredient of recipe.ingredients) {
      const key = normalizedName(ingredient.name);
      const existing = neededTotals.get(key);
      neededTotals.set(key, {
        quantity: (existing?.quantity ?? 0) + ingredient.quantity,
        unit: ingredient.unit,
      });
    }
  }

  const groceryList = [...neededTotals.entries()]
    .map(([key, { quantity, unit }]) => {
      const inPantry = pantryByIngredient.get(key) ?? 0;
      const stillNeeded = quantity - inPantry;
      return { ingredientName: key, quantity: stillNeeded, unit };
    })
    .filter((item) => item.quantity > 0);

  const usedNearExpiryIngredients = combo
    .flatMap((r) => r.ingredients.map((i) => normalizedName(i.name)))
    .filter((name, i, arr) => arr.indexOf(name) === i)
    .filter((name) => nearExpiryIngredients.has(name));

  return {
    recipes: combo,
    wasteScore: Math.round(score * 10) / 10,
    usedNearExpiryIngredients,
    groceryList,
  };
}
