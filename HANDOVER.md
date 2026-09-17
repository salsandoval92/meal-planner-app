# Handover: Moving to Your Windows Desktop

This is a step-by-step guide to get this project running on your own
Windows PC, so it's no longer tied to this temporary cloud session. Follow
it top to bottom — each step tells you exactly what to type or click.

## What you're getting

Everything built so far, working end to end:
- The data model (households, pantry, recipes, meal plans, grocery lists)
- Pantry CRUD, waste-reduction meal-plan generation, "mark as cooked"
- Photo-based pantry scanning and the conversational setup chat, both
  powered by Google's free Gemini API
- The demo web page (`http://localhost:3000`) that ties it all together

**Not yet built** (this was brainstormed, not implemented): the
"build-once-with-AI, refresh-weekly" data foundation — a large recipe
catalog, an Abu Dhabi grocery store directory, cached ingredient pricing,
an ingredient-substitution table, and the Windows Task Scheduler job that
refreshes them. That's the natural next step once this handover is done and
you're running locally — see the bottom of this doc.

---

## Step 1 — Install the tools (one-time)

Install these in order. Each is a normal Windows installer — download,
run, click through with defaults, done.

1. **Git** — https://git-scm.com/download/win
   Lets you download ("clone") the project's code.
2. **Node.js (LTS version)** — https://nodejs.org
   Runs the app's server code.
3. **PostgreSQL** — https://www.postgresql.org/download/windows
   The database. Use the installer from EnterpriseDB (the link above sends
   you there). During install:
   - It will ask you to set a password for the `postgres` admin user —
     pick one and **write it down**, you'll need it once in Step 3.
   - Keep the default port (`5432`).
   - You can uncheck "Stack Builder" at the end — not needed.

   *(You don't need Docker for this — a native Windows install is simpler
   and doesn't require enabling virtualization.)*

To check everything installed correctly, open **PowerShell** (search for
it in the Start menu) and run:

```powershell
git --version
node --version
psql --version
```

Each should print a version number. If any command says "not recognized,"
close and reopen PowerShell (installers sometimes need that to update your
PATH) before trying again.

## Step 2 — Get the code

In PowerShell:

```powershell
cd Documents
git clone https://github.com/salsandoval92/meal-planner-app.git
cd meal-planner-app
git checkout claude/meal-planning-waste-reduction-h0vuy0
npm install
```

That last command downloads all the project's dependencies — it can take
a minute or two.

## Step 3 — Create the database

Still in PowerShell, from the `meal-planner-app` folder:

```powershell
psql -U postgres -c "CREATE ROLE mealplanner LOGIN PASSWORD 'mealplanner';"
psql -U postgres -c "CREATE DATABASE mealplanner OWNER mealplanner;"
```

Each command will prompt for the `postgres` password you set during
installation — type it and press Enter (it won't show characters as you
type, that's normal).

## Step 4 — Configure the app

```powershell
copy .env.example .env
notepad .env
```

Notepad will open. Make sure `DATABASE_URL` matches what you just created
— it should already look like this by default:

```
DATABASE_URL="postgresql://mealplanner:mealplanner@localhost:5432/mealplanner"
```

Then add your free Gemini key on the `GEMINI_API_KEY=` line (get one at
https://ai.google.dev/aistudio if you haven't yet). Save and close Notepad.

## Step 5 — Build the database tables and load demo data

```powershell
npm run prisma:migrate
npm run seed
```

## Step 6 — Start the app

```powershell
npm run dev
```

You should see `Meal planner API listening on http://localhost:3000`.
Open that address in a browser — that's the demo page. Leave this
PowerShell window open while you're using the app; closing it stops the
server. (Next time, you only need to repeat this step — Steps 1–5 are
one-time setup.)

---

## Sharing it with your wife over your home WiFi

1. In PowerShell, run `ipconfig` and find the line that says **IPv4
   Address** under your active WiFi adapter — it'll look like
   `192.168.1.XX`. That's your PC's address on your home network.
2. **Allow it through Windows Firewall** (one-time): open *Windows
   Security* → *Firewall & network protection* → *Advanced settings* →
   *Inbound Rules* → *New Rule* → **Port** → TCP, specific port `3000` →
   *Allow the connection* → apply to all profiles → name it something like
   "Meal Planner App".
3. With `npm run dev` running, she can open
   `http://<that IP address>:3000` in her phone's browser, as long as her
   phone is on the same WiFi network as your PC.

## Next steps

- The README.md in this project has more detail on the API endpoints and
  project structure if you want to poke around.
- To build the "weekly maintenance script" data-foundation feature we
  brainstormed (bigger recipe catalog, Abu Dhabi store directory, cached
  pricing, substitution table, scheduled via Windows Task Scheduler): the
  easiest way is to install Claude Code locally
  (https://code.claude.com/docs/en/claude-code) and open a session in this
  same `meal-planner-app` folder on your desktop — that gives you (and me)
  direct access to your machine to build and test the scheduled script for
  real, which isn't possible from this cloud session. Everything already
  built is committed to the `claude/meal-planning-waste-reduction-h0vuy0`
  branch and ready to continue from.
