# Design decisions I made

The code was built with AI assistance. This page lists the decisions that are mine — the rules I
chose, the alternatives I rejected, and the assumptions I have to defend. Every one of them is
visible in the running system.

---

## 1. Food must be able to arrive safely (my main contribution)

**The rule:** before any scoring happens, the engine estimates how long it takes to get the food
to each organisation — distance ÷ travel speed, plus handling time — and compares that with the
time left on the food's safe window. If the food would arrive too late to be served, that
organisation is **excluded**, with the reason written out.

**Why I added it:** I first had distance as just another score (further away = lower points). Then
I realised that is wrong: if food will still be "the nearest option" but arrives after its safe
window, giving it there isn't a lower-priority choice, it's an unsafe one. Distance being
*disqualifying* is a safety decision, not a preference — so it became a hard filter in front of
the scoring, not a weight inside it.

**Assumptions I chose (and will defend):**

| Assumption | Value | Why |
|---|---|---|
| City travel speed | 20 km/h | conservative two-wheeler average with Chennai traffic, not empty-road speed |
| Handling time at the donor | 10 min | loading, packing and handover |
| Serving buffer | 60 min | the recipient needs at least an hour to portion and serve before the food is unsafe |

**Where you can see it:** Allocation Engine → select *Catering Excess – Veg Pulao* (only 2 hours
of safe window left) → Preview decision. Three organisations are rejected with a line such as
*"the trip needs about 85 min (travel + handling) but only 60 min are available"*, while the two
that can make it show *"arrives with ~15 min to spare"*.

**What I would improve next:** use the assigned volunteer's actual vehicle (bike vs car) instead
of one average speed, and re-check the margin when the volunteer accepts the task.

---

## 2. Order of the filters

`verified → storage capacity → food preference → safe arrival` then scoring.

Cheapest and most absolute checks run first (an unverified organisation can never receive food,
and neither can one with no space). The safety rule runs last, just before scoring, because it
needs the distance calculation. This order is why the engine page shows a short, readable list
of *why* each organisation was rejected instead of one vague score.

## 3. The six scoring factors and their weights

Expiry urgency 25% · demand match 20% · storage fit 15% · proximity 15% · food preference 15% ·
fair distribution 10%.

I started from equal weights. In testing that let the same couple of organisations win almost
every time — the nearest, biggest ones — which is exactly the unfairness the project exists to
fix. So I raised expiry (the food is the thing that perishes) and kept fairness as a smaller
factor that tips close decisions towards whoever has received least in the last 30 days.

## 4. Accepting a six-factor model instead of machine learning

With this much data, a learned model would be guesswork dressed up as intelligence. A weighted
model where every number can be explained to a restaurant owner is more useful — and it is what
makes the "decision explanation" feature possible.

## 5. What I deliberately did not build

Live GPS tracking, in-app chat between donor and volunteer, and donation photos. They add surface
area without improving the allocation decision, which is the part the project is actually about.

---

## Optional: what the kitchens told me

_If I run the interviews (restaurants, bakeries, NGOs), I will replace this section with what I
learned — how long each food category is actually kept, how much storage NGOs can free at short
notice, and what makes them refuse a donation — and use those numbers instead of my current
assumptions. The engine already has one place for these values (the safety-rule constants in
`AllocationEngineService` and the shelf-life values on each food category), so calibration is a
one-line change per value._
