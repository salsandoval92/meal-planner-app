import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const household = await prisma.household.create({
    data: {
      name: "Demo Household",
      region: "US-TX",
      budgetTarget: 150,
      members: {
        create: [
          { name: "Alex", age: 34, allergies: [], dietaryTags: [] },
          { name: "Sam", age: 32, allergies: ["peanuts"], dietaryTags: ["vegetarian-friendly"] },
        ],
      },
    },
  });

  const now = new Date();
  const inDays = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  await prisma.pantryItem.createMany({
    data: [
      // Near-expiry items: the generator should prefer recipes using these.
      { householdId: household.id, ingredientName: "spinach", quantity: 200, unit: "g", storageMethod: "FRIDGE", purchaseDate: inDays(-4), estimatedExpiryDate: inDays(2), source: "MANUAL" },
      { householdId: household.id, ingredientName: "chicken breast", quantity: 500, unit: "g", storageMethod: "FRIDGE", purchaseDate: inDays(-2), estimatedExpiryDate: inDays(3), source: "MANUAL" },
      // Longer-life pantry staples.
      { householdId: household.id, ingredientName: "rice", quantity: 1000, unit: "g", storageMethod: "PANTRY", purchaseDate: inDays(-10), estimatedExpiryDate: inDays(300), source: "MANUAL" },
      { householdId: household.id, ingredientName: "garlic", quantity: 5, unit: "count", storageMethod: "PANTRY", purchaseDate: inDays(-10), estimatedExpiryDate: inDays(60), source: "MANUAL" },
      { householdId: household.id, ingredientName: "onion", quantity: 3, unit: "count", storageMethod: "PANTRY", purchaseDate: inDays(-10), estimatedExpiryDate: inDays(40), source: "MANUAL" },
    ],
  });

  const recipes = [
    {
      title: "Garlic Chicken Rice Bowl",
      cuisine: "American",
      steps: ["Cook rice", "Saute garlic and onion", "Sear chicken", "Combine and serve"],
      requiredTools: ["stove", "pot"],
      dietaryTags: [],
      servings: 4,
      estimatedCostPerServing: 3.5,
      ingredients: [
        { name: "chicken breast", quantity: 400, unit: "g" },
        { name: "rice", quantity: 300, unit: "g" },
        { name: "garlic", quantity: 3, unit: "count" },
        { name: "onion", quantity: 1, unit: "count" },
      ],
    },
    {
      title: "Spinach & Garlic Sauteed Rice",
      cuisine: "Mediterranean",
      steps: ["Cook rice", "Saute garlic and spinach", "Toss together"],
      requiredTools: ["stove", "pan"],
      dietaryTags: ["vegetarian"],
      servings: 4,
      estimatedCostPerServing: 2.25,
      ingredients: [
        { name: "spinach", quantity: 200, unit: "g" },
        { name: "rice", quantity: 250, unit: "g" },
        { name: "garlic", quantity: 2, unit: "count" },
      ],
    },
    {
      title: "Chicken & Spinach Skillet",
      cuisine: "American",
      steps: ["Sear chicken", "Wilt spinach with garlic and onion", "Combine"],
      requiredTools: ["stove", "pan"],
      dietaryTags: [],
      servings: 4,
      estimatedCostPerServing: 4.0,
      ingredients: [
        { name: "chicken breast", quantity: 400, unit: "g" },
        { name: "spinach", quantity: 150, unit: "g" },
        { name: "garlic", quantity: 2, unit: "count" },
        { name: "onion", quantity: 1, unit: "count" },
      ],
    },
    {
      title: "Simple Tomato Pasta",
      cuisine: "Italian",
      steps: ["Boil pasta", "Make tomato sauce with garlic and onion", "Toss"],
      requiredTools: ["stove", "pot"],
      dietaryTags: ["vegetarian"],
      servings: 4,
      estimatedCostPerServing: 2.75,
      ingredients: [
        { name: "pasta", quantity: 400, unit: "g" },
        { name: "tomato", quantity: 4, unit: "count" },
        { name: "garlic", quantity: 2, unit: "count" },
        { name: "onion", quantity: 1, unit: "count" },
      ],
    },
    {
      title: "Chicken Tomato Pasta Bake",
      cuisine: "Italian",
      steps: ["Boil pasta", "Sear chicken", "Bake with tomato sauce"],
      requiredTools: ["stove", "oven"],
      dietaryTags: [],
      servings: 4,
      estimatedCostPerServing: 4.25,
      ingredients: [
        { name: "chicken breast", quantity: 300, unit: "g" },
        { name: "pasta", quantity: 300, unit: "g" },
        { name: "tomato", quantity: 3, unit: "count" },
        { name: "garlic", quantity: 2, unit: "count" },
      ],
    },
    {
      title: "Veggie Fried Rice",
      cuisine: "Asian",
      steps: ["Cook rice", "Stir-fry onion, garlic, spinach", "Add egg and rice"],
      requiredTools: ["stove", "wok"],
      dietaryTags: ["vegetarian"],
      servings: 4,
      estimatedCostPerServing: 2.5,
      ingredients: [
        { name: "rice", quantity: 300, unit: "g" },
        { name: "egg", quantity: 3, unit: "count" },
        { name: "onion", quantity: 1, unit: "count" },
        { name: "garlic", quantity: 2, unit: "count" },
        { name: "spinach", quantity: 100, unit: "g" },
      ],
    },
    {
      title: "Beef Tacos",
      cuisine: "Mexican",
      steps: ["Brown beef with onion and garlic", "Warm tortillas", "Assemble"],
      requiredTools: ["stove", "pan"],
      dietaryTags: [],
      servings: 4,
      estimatedCostPerServing: 3.75,
      ingredients: [
        { name: "ground beef", quantity: 400, unit: "g" },
        { name: "tortilla", quantity: 8, unit: "count" },
        { name: "onion", quantity: 1, unit: "count" },
        { name: "garlic", quantity: 2, unit: "count" },
      ],
    },
    {
      title: "Egg Fried Rice with Chicken",
      cuisine: "Asian",
      steps: ["Cook rice", "Stir-fry chicken, onion, garlic", "Add egg"],
      requiredTools: ["stove", "wok"],
      dietaryTags: [],
      servings: 4,
      estimatedCostPerServing: 3.9,
      ingredients: [
        { name: "chicken breast", quantity: 300, unit: "g" },
        { name: "rice", quantity: 300, unit: "g" },
        { name: "egg", quantity: 2, unit: "count" },
        { name: "onion", quantity: 1, unit: "count" },
        { name: "garlic", quantity: 2, unit: "count" },
      ],
    },
  ];

  await prisma.recipe.createMany({
    data: recipes.map((r) => ({ ...r, ingredients: r.ingredients })),
  });

  await prisma.shelfLifeReference.createMany({
    data: [
      { ingredientName: "chicken breast", region: "US", storageMethod: "FRIDGE", estimatedDaysMin: 1, estimatedDaysMax: 2, confidence: "high", source: "USDA FoodKeeper" },
      { ingredientName: "spinach", region: "US", storageMethod: "FRIDGE", estimatedDaysMin: 5, estimatedDaysMax: 7, confidence: "high", source: "USDA FoodKeeper" },
      { ingredientName: "onion", region: "US", storageMethod: "PANTRY", estimatedDaysMin: 30, estimatedDaysMax: 60, confidence: "medium", source: "USDA FoodKeeper" },
      { ingredientName: "rice", region: "US", storageMethod: "PANTRY", estimatedDaysMin: 365, estimatedDaysMax: 730, confidence: "high", source: "USDA FoodKeeper" },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeded household ${household.id} with pantry items and ${recipes.length} recipes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
