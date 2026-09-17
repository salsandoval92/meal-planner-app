# Meal Planner App — Backend Prototype

This is the starting backend (the "server" that an iOS or Android app would
talk to) for an AI meal-planning app whose main goal is **reducing food
waste** by planning a week's meals as a set that shares ingredients, instead
of picking recipes one at a time.

You don't need to know how to code to run this and see it work — just
follow the steps below.

## What's in here right now

Included:
- **Database design** (`prisma/schema.prisma`) — households, household
  members, pantry items, recipes, weekly meal plans, grocery lists, regional
  shelf-life data, and the onboarding chat transcript.
- **A working API** to create households, add/remove pantry items, and
  generate a weekly meal plan.
- **The waste-reduction "brain"** (`src/services/mealPlanGenerator.ts`) —
  given a pantry and a list of possible recipes, it picks the 5 recipes for
  the week that best (a) use up ingredients that are about to expire and
  (b) share ingredients with each other, so you don't end up with a random
  half-used bag of something in the fridge.
- **A "mark as cooked" action** that automatically subtracts the recipe's
  ingredients from your pantry.
- **Pantry photo scanning** (`src/services/pantryVision.ts`) — send Claude
  one or more photos of a fridge/freezer/pantry shelf and it identifies the
  items it can see, with an estimated quantity and a confidence level.
  Nothing is saved automatically: you always get a chance to review and edit
  the detected list before it's added to your pantry (per the project
  brief's "never auto-commit silently" rule).
- **A conversational setup assistant** (`src/services/onboardingAssistant.ts`)
  — instead of a long form, you chat with Claude about your household
  (members, allergies, dietary goals), cuisine preferences, kitchen
  equipment, preferred grocery stores, region, budget, and a calorie target
  per serving. It saves each detail as you confirm it, so you can stop and
  resume the conversation at any point.
- Some **demo data** (a sample household, pantry, and 8 recipes) so you can
  try the core meal-plan/pantry loop immediately without needing an AI key.
- A small **demo web page** (`public/`, served at `http://localhost:3000/`)
  that walks through the whole flow in a browser.

Not included yet (on purpose, deferred per the original project brief):
- Fetching live grocery prices from stores like HEB or Spinneys — flagged as
  legally uncertain (retailer terms of service) and lower priority.
- Any phone app itself — this is just the backend/server. An iOS or Android
  app would be built separately and would call this API.

## ⚠️ Important: the AI features need your own API key, and cost money to use

The pantry photo scan and the setup chat both call the real Claude API
(`@anthropic-ai/sdk`), not a mock. To use them:

1. Get a key at https://console.anthropic.com/settings/keys (this requires
   setting up billing on your Anthropic account — separate from any Claude
   subscription you might have).
2. Put it in your `.env` file: `ANTHROPIC_API_KEY=sk-ant-...`

**I was not able to test these two features against a real key myself** — I
don't have API credentials in this environment. I built them carefully
against Anthropic's documented API (structured vision output for the photo
scan, tool-use for the chat), and verified everything up to the actual model
call: request validation, file upload handling, database writes, and the
demo page all work correctly, and a request with no key configured fails
with a clear error message rather than crashing. But I haven't seen the
vision detection accuracy or the chat's conversational quality firsthand —
please try it with your own key and tell me how it goes, since prompt
wording is the kind of thing that often needs a tuning pass after first
real use.

Each photo scan and each chat message is a paid API call (roughly a few
cents each on Claude's current pricing — small for occasional testing, but
worth being aware of if you're scanning many shelves at once).

Without a key, everything else still works: manual pantry entry, meal plan
generation, and cooking — the demo page has a manual "add item" fallback
right next to the photo scanner for exactly this reason.

## Project structure, in plain terms

```
prisma/schema.prisma     The database design: what information gets stored and how it relates.
prisma/seed.ts           A script that fills the database with sample data to try things out.
src/server.ts            Starts the web server.
src/routes/               The API "endpoints" the URLs a phone app (or the demo page) would call:
  household.ts             create/list households
  pantry.ts                 pantry CRUD + photo scan/confirm endpoints
  mealPlan.ts                generate a weekly plan, mark a recipe cooked
  onboarding.ts               the setup-chat endpoints
src/services/
  mealPlanGenerator.ts      the waste-reduction scoring/selection logic
  pantryVision.ts            calls Claude to detect pantry items from photos
  onboardingAssistant.ts     runs the setup chat via Claude tool-use
src/lib/
  prisma.ts                 boilerplate for talking to the database
  anthropicClient.ts          boilerplate for talking to the Claude API
public/index.html          the demo page
```

## Running it yourself

You'll need three things installed on your computer:
1. **Node.js** (version 20 or newer) — https://nodejs.org (download the
   "LTS" version and run the installer)
2. **PostgreSQL** (a database) — easiest way is via **Docker**:
   install Docker Desktop from https://www.docker.com/products/docker-desktop
3. (Optional, for the AI features) an Anthropic API key — see above.

Then, in a terminal, from this project's folder:

```bash
# 1. Install the project's dependencies (one-time)
npm install

# 2. Start a local database (uses the docker-compose.yml file in this folder)
docker compose up -d

# 3. Copy the example settings file, so the app knows how to reach the database
cp .env.example .env
# then open .env and paste in your ANTHROPIC_API_KEY if you have one

# 4. Create the database tables from the schema
npm run prisma:migrate

# 5. Fill the database with sample data (a demo household, pantry, and recipes)
npm run seed

# 6. Start the server
npm run dev
```

You should see `Meal planner API listening on http://localhost:3000`.

### Trying it out

Open **http://localhost:3000** in a browser — that's the demo page, and the
easiest way to try everything: the setup chat, photo pantry scanning (or
manual entry), viewing the pantry, generating a meal plan, and marking a
recipe cooked.

If you'd rather use the API directly (or don't have a browser handy):

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
1. **Try the setup chat and photo scan with your own API key** and see how
   the prompts hold up in practice — this is the biggest open unknown right
   now, and the cheapest thing to learn from before building more on top.
2. **Swap the fixed recipe list for AI-generated candidates** in meal-plan
   generation — have Claude propose a larger, personalized pool of recipes
   based on the household profile the setup chat now collects, then feed
   them into the existing `generateWeeklyMealPlan()` selection logic (it
   already expects exactly this shape of input).
3. **Validate the idea with a few real users** before investing further —
   see the "Open Items" section of the original project brief.
4. Once the above feels solid: tackle live grocery pricing (one retailer
   adapter as a proof of concept) — flagged as higher-risk/higher-effort in
   the project brief, and worth a legal read given the retailer
   terms-of-service question.
