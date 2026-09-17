import express from "express";
import { householdRouter } from "./routes/household.js";
import { pantryRouter } from "./routes/pantry.js";
import { mealPlanRouter } from "./routes/mealPlan.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/households", householdRouter);
app.use("/pantry-items", pantryRouter);
app.use("/meal-plans", mealPlanRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`Meal planner API listening on http://localhost:${port}`);
});
