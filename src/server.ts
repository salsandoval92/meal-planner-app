import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { householdRouter } from "./routes/household.js";
import { pantryRouter } from "./routes/pantry.js";
import { mealPlanRouter } from "./routes/mealPlan.js";
import { onboardingRouter } from "./routes/onboarding.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/households", householdRouter);
app.use("/pantry-items", pantryRouter);
app.use("/meal-plans", mealPlanRouter);
app.use("/onboarding", onboardingRouter);

// Small demo page that exercises the API above — not the planned iOS/Android
// app, just a way to see the pantry -> meal plan -> cook flow in a browser.
app.use(express.static(path.join(__dirname, "..", "public")));

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`Meal planner API listening on http://localhost:${port}`);
});
