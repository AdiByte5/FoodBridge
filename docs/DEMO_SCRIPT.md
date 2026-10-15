# FoodBridge — Presentation Run Sheet

Private notes for walking sir through the working system. Open **http://localhost:5173**
(run `./scripts/start-all.sh` first) and sign in as the administrator.

**How to frame it:** show the modules that are complete, one by one, and close by saying the
remaining modules are planned for the next review. The website itself has no "demo" or
"phase" wording anywhere — it reads like the finished product.

---

## The opening line

> "Restaurants, hotels and supermarkets throw away food that is still safe to eat while NGOs,
> food banks and shelters run short. FoodBridge solves that with an intelligent allocation
> engine — it decides which organisation should receive each donation and explains why.
> I'll walk you through the working system now, and at the end I'll show what's coming next."

---

## Run sheet — show these in order

### 1 · Opening (1 min) — Login page

Point at the live counters (donations tracked, kg rescued, partner NGOs) — they are read from
MySQL, not hardcoded.

> "The platform already tracks 16 donations, 7 donor accounts and about 410 kg of food.
> One JWT-secured login serves four roles — donor, recipient organisation, volunteer and
> administrator — and each role sees only the screens its responsibilities allow."

### 2 · Donor registers surplus food (1.5 min) — Donor Dashboard

Sign in as `donor@foodbridge.org` / `Donor@123`. Press **Register donation**, fill the form
(category, quantity, expiry preset, storage requirement, pickup point) and save.

> "The donor registers the food once, and can still modify or cancel it while it is pending.
> From this point everything is decided by the engine — no phone calls, no WhatsApp groups.
> Donors only see their own donations; the allocation engine is an operations screen, so I'll
> switch to the administrator account for it."

### 3 · The engine decides (2.5 min) — Allocation Engine *(the centrepiece)*

Sign out → sign in as `admin@foodbridge.org` / `Admin@123`, then Sidebar → **Allocation Engine**.
Select the pending donation → **Preview decision**.

Walk down the panel:

1. **Eligibility filters** — point at the excluded organisations and their reasons ("not
   verified yet", "free storage is less than the donation size", "category not accepted").
   Then select **Catering Excess – Veg Pulao** instead: it has only 2 hours of safe window left,
   so three organisations are rejected with *"the trip needs about 85 min but only 60 min are
   available before the safe window closes"* — this is my own food-safety rule, described below.
2. **Ranked recipients** — scores with distances, best match first.
3. **Six-factor breakdown** — expiry urgency 25%, demand match 20%, storage fit 15%,
   proximity 15%, food preference 15%, fairness 10%.
4. **Decision explanation** — read the generated sentence aloud.

> "Filters run before scoring, so an unverified organisation or a full warehouse can never win.
> Six weighted factors produce a 0–100 score, and the engine writes the reasoning in plain
> English — every decision is explainable."

### 4 · Run the allocation (1 min) — same screen

Press **Run & allocate**.

> "The decision is stored with its full factor breakdown and the recipient is notified. I can
> open this allocation weeks later and see exactly why it was made."

### 5 · Recipient side (1.5 min) — Recipient Dashboard

Sign out → sign in as `recipient@foodbridge.org` / `Recipient@123`.

Show the incoming allocation with its priority score → **Why this match?** (the same factor
bars) → the **Demand & preferences** editor (capacity, current load, demand, beneficiaries,
accepted categories).

> "The engine's inputs are owned by the recipient — they keep their demand and capacity up to
> date, and that immediately changes how they score in future allocations."

### 6 · Finish the rescue yourself (2.5 min) — Volunteer Hub → Recipient

Sign out → sign in as `volunteer@foodbridge.org` / `Volunteer@123`. Open the pickup task and
walk it through: **Accept task → Start pickup → Mark in transit → Mark delivered**.

Then sign in as `recipient@foodbridge.org` / `Recipient@123` and press **Confirm receipt** on
the delivered allocation.

> "I'm doing each step live, in the account that owns it — the volunteer moves the delivery
> through its stages, and the recipient closes it by confirming receipt. Storage load, the
> volunteer's delivery count, notifications and the audit trail all update from this."

### 7 · Close (1 min) — Command Center

Point at the KPIs, the 14-day rescue trend, the fairness chart and the pipeline funnel.

> "So the platform, the donation and recipient management, the allocation engine, volunteer
> coordination, notifications and the analytics dashboards are complete and working. Next I'm
> completing the remaining work: hardening the deployment, expanding the automated test suite
> and packaging the application for hosting."

---

## Likely questions & answers

**"How is the recipient chosen?"**
Three eligibility filters, then six weighted factors (expiry urgency 25%, demand match 20%,
storage fit 15%, proximity 15%, food preference 15%, fairness 10%). The formula lives in
`AllocationEngineService`; the weights are exposed at `GET /api/public/engine-weights`.

**"What is your own contribution — this could have been generated?"**
"The scoring model is standard engineering. The rule that is mine is the food-safety arrival
check: before scoring, the engine works out whether the food can physically get there in time —
distance divided by 20 km/h city speed, plus 10 minutes handling, keeping an hour free for the
recipient to serve it. If it can't arrive safely, the organisation is rejected with a reason,
not just scored lower. I started with distance as a soft score and changed it to a hard rule
after realising that 'too far' isn't a lower priority, it's unsafe. The assumptions are mine to
defend — and they're in docs/DESIGN_DECISIONS.md."

**"How do you stop one NGO taking everything?"**
The fairness factor scores each recipient by kilograms received in the last 30 days, so the
engine prefers whoever has received less. The analytics page measures the spread across partners.

**"How is the volunteer chosen?"**
55% proximity to the pickup point, 25% current delivery load, 20% completed-delivery experience —
and the match reasoning is written into the assignment record.

**"Is this real data or hardcoded screens?"**
Everything is MySQL. Each click writes real rows: donation, allocation with its score breakdown,
volunteer assignment, delivery timestamps, notifications and audit entries.
`GET /actuator/health` shows the live database connection.

**"What's left to do?"**
Deployment and packaging, a wider automated test suite, and the planned refinements listed at
the end of the walkthrough.

**"Can anyone donate?"**
Yes — the sign-up page lets a donor be a restaurant, hotel, supermarket, bakery, caterer, a
company, an NGO, or simply an individual person. Individuals donate under their own name, and
new recipient organizations go into the administrator's verification queue.

**"What's the tech stack?"**
React 19 + TypeScript + Tailwind v4 on the front end, Spring Boot 4 (Java 21) REST API with
Spring Security JWT, and MySQL 26.7 — the exact stack from the Lab 2 requirements document.

---

## Before sir arrives

1. `./scripts/start-all.sh`
2. Admin → **Audit & System** → **Restore sample data** (so the numbers are pristine).
3. Keep this run sheet open on your phone or second screen, and the app full-screen in the browser.

## Emergency fallback (only if something breaks mid-demo)

The one-click rescue still exists behind the admin API, but it is not linked anywhere in the app:

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@foodbridge.org","password":"Admin@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s -X POST http://localhost:8080/api/admin/sample-data/scenario -H "Authorization: Bearer $TOKEN" | head -c 200
```

It replays donation → allocation → volunteer → delivery → confirmation in one call. Use it only
as a recovery move, then carry on manually.
