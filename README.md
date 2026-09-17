# Meal Planner App — Backend Prototype

This is the starting backend (the "server" that an iOS or Android app would
talk to) for an AI meal-planning app whose main goal is **reducing food
waste** by planning a week's meals as a set that shares ingredients, instead
of picking recipes one at a time.

You don't need to know how to code to run this and see it work — just
follow the steps below.

## What's in here right now

This is a first slice of the full idea, chosen to prove out the riskiest and
most important part first: **does the "pick recipes that share ingredients
and use up what's about to expire" logic actually work?**

Included:
- **Database design** (`prisma/schema.prisma`) — the full set of tables from
  the project plan: households, household members, pantry items, recipes,
  weekly meal plans, grocery lists, and regional shelf-life data.
- **A working API** to create households, add/remove pantry items, and
  generate a weekly meal plan.
- **The waste-reduction "brain"** (`src/services/mealPlanGenerator.ts`) —
  given a pantry and a list of possible recipes, it picks the 5 recipes for
  the week that best (a) use up ingredients that are about to expire and
  (b) share ingredients with each other, so you don't end up with a random
  half-used bag of something in the fridge.
- **A "mark as cooked" action** that automatically subtracts the recipe's
  ingredients from your pantry.
- Some **demo data** (a sample household, pantry, and 8 recipes) so you can
  try it immediately without typing anything in.

Not included yet (on purpose, to keep this first step manageable):
- Calling a real AI model to generate recipes — right now the recipes come
  from a small fixed demo list. The "smart" ingredient-overlap picking logic
  is real, though; a future step would swap the fixed list for AI-generated
  candidates.
- Fetching live grocery prices from stores like HEB or Spinneys — the
  project plan flags this as legally uncertain (retailer terms of service)
  and lower priority, so it's deferred.
- Photo-based pantry scanning — for now, pantry items are entered as data
  (the API a phone app would call), not from a photo.
- Any phone app itself — this is just the backend/server. An iOS or Android
  app would be built separately and would call this API.

## Project structure, in plain terms

```
prisma/schema.prisma     The database design: what information gets stored and how it relates.
prisma/seed.ts           A script that fills the database with sample data to try things out.
src/server.ts            Starts the web server.
src/routes/              The API "endpoints" — the URLs a phone app would call
                          (e.g. "give me this household's pantry", "generate this week's meal plan").
src/services/mealPlanGenerator.ts   The core waste-reduction logic, explained above.
src/lib/prisma.ts        Boilerplate for talking to the database.
```

## Running it yourself

You'll need two free tools installed on your computer first:
1. **Node.js** (version 20 or newer) — https://nodejs.org (download the
   "LTS" version and run the installer)
2. **PostgreSQL** (a database) — easiest way is via **Docker**:
   install Docker Desktop from https://www.docker.com/products/docker-desktop

Then, in a terminal, from this project's folder:

```bash
# 1. Install the project's dependencies (one-time)
npm install

# 2. Start a local database (uses the docker-compose.yml file in this folder)
docker compose up -d

# 3. Copy the example settings file, so the app knows how to reach the database
cp .env.example .env

# 4. Create the database tables from the schema
npm run prisma:migrate

# 5. Fill the database with sample data (a demo household, pantry, and recipes)
npm run seed

# 6. Start the server
npm run dev
```

You should see `Meal planner API listening on http://localhost:3000`.

### Trying it out

With the server running, open a new terminal and try these (or use a tool
like [Postman](https://www.postman.com/) if you prefer clicking over typing):

```bash
# See the demo household (copy its "id" for the next steps)
curl http://localhost:3000/households

# See its pantry (replace <householdId>)
curl "http://localhost:3000/pantry-items?householdId=<householdId>"

# Generate this week's meal plan
curl -X POST http://localhost:3000/meal-plans/generate \
  -H "Content-Type: application/json" \
  -d '{"householdId": "<householdId>", "weekStart": "2026-09-21"}'
```

The response includes a `wasteScore`, which recipes were chosen, which
near-expiry pantry ingredients got used, and the resulting grocery list
(only what's missing from the pantry).

## Suggested next steps

Roughly in order of value:
1. **Try the demo, tweak the sample pantry/recipes** in `prisma/seed.ts` to
   get a feel for how the scoring logic behaves — this is the cheapest way
   to build intuition before investing more.
2. **Swap the fixed recipe list for AI-generated candidates** — have an AI
   model propose a larger, personalized pool of recipes based on the
   household's preferences, then feed them into the same
   `generateWeeklyMealPlan()` selection logic (it already expects exactly
   this shape of input).
3. **Build manual pantry entry into a real app UI** (iOS/Android) that calls
   this API, before attempting photo-based pantry scanning.
4. **Validate the idea with a few real users** before investing further —
   see the "Open Items" section of the original project brief.
5. Only once the above feels solid: tackle live grocery pricing (one
   retailer adapter as a proof of concept) and photo-based pantry
   onboarding — both are flagged as higher-risk/higher-effort in the
   project brief.
