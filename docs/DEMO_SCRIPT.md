# FoodBridge live demonstration

The deck explains the design. This walkthrough shows it working: one donation registered by a
donor, judged by the engine, accepted by a recipient, delivered by a volunteer, confirmed, and
finally visible in the reports and the audit trail.

Plan on 5 minutes for the ten slides and 6 minutes for this demonstration.

---

## 1. Setup, five minutes before you present

1. Start the stack: `./scripts/start-all.sh`, or double-click **FoodBridge.command** on the Desktop.
   Wait for the line **"FoodBridge is running"**.
2. Open **Audit & System → Restore sample data**. Do this immediately before the demonstration,
   not the night before: the urgent donation used on slide 6 of the deck expires two hours after
   a restore.
3. Open **two browser windows** so you can show two roles at once:
   - Window A: a normal window, where you will use the administrator and donor accounts.
   - Window B: a **private window** (Chrome: Command-Shift-N), where you will use the recipient
     and volunteer accounts.

   Signing in as a second role in the same window replaces the first session, which is why the
   private window is needed. Both windows talk to the same local server.
4. In Window A go to **Command Center**. In Window B open `localhost:5173/login` and leave it there.
5. Keep this page open on your phone or a second screen. Each step below states which window to use.

**The accounts you may need** (every password follows the pattern Role@123):

| Role | Sign in as |
|---|---|
| Donor (Spice Route Restaurant) | `donor@foodbridge.org` / `Donor@123` |
| Recipient: Akshaya Patra Kitchen | `recipient@foodbridge.org` / `Recipient@123` |
| Recipient: Sneha Sadan Orphanage | `orphanage@foodbridge.org` / `Recipient@123` |
| Recipient: Chennai Food Bank | `foodbank@foodbridge.org` / `Recipient@123` |
| Recipient: Anand Ashram Shelter | `shelter@foodbridge.org` / `Recipient@123` |
| Recipient: Sanjeevini Community Kitchen | `kitchen@foodbridge.org` / `Recipient@123` |
| Volunteer: Ravi Kumar | `volunteer@foodbridge.org` / `Volunteer@123` |
| Volunteer: Priya Sharma | `priya@foodbridge.org` / `Volunteer@123` |
| Volunteer: Arjun Mehta | `arjun@foodbridge.org` / `Volunteer@123` |
| Administrator | `admin@foodbridge.org` / `Admin@123` |

**Check before you start:** the Allocation Engine page should list **"Catering Excess – Veg Pulo"**
at the top of the queue with about two hours remaining. If it does not, restore the sample data
again, or use the fallback in section 5.

---

## 2. The walkthrough

### Part 1. The donor registers surplus food (Window A, 60 seconds)

Sign out if needed, then on the login page press the **Donor** sample account button and **Sign in**.

- Point at the sidebar: a donor sees only their own workspace and notifications. No engine page,
  no reports.
- Press **Register donation** and enter:
  - Food: `Veg Pulao & Raita`
  - Category: `Cooked Meals`
  - Quantity: `18` kg
  - Expiry: press the **+2h** preset
  - Storage: `Hot holding`
  - Notes: `Freshly prepared surplus from the lunch service`
- Save. The donation appears in the list as **Pending** with a two-hour countdown.

> Say: "This is the only step a donor performs. From here the platform decides who receives it.
> Notice the donor sees nothing about other organizations or other donations."

### Part 2. The administrator runs the engine (Window A, 2 minutes) — the centrepiece

Sign out, sign in with the **Administrator** sample account, then open **Allocation Engine**.
The queue is ordered **most urgent first**, and it now holds two donations, both with about two
hours remaining: the seeded **"Catering Excess - Veg Pulo"** and the one you just registered.
Select the seeded one for the first preview, because it comes from a caterer across the city and
that is what makes the arrival rule reject three organizations.

**2a. Show the arrival rule on the seeded donation (40 seconds).**

- Leave **"Catering Excess - Veg Pulo"** selected and press **Preview decision**.
- Walk down the result:
  1. The summary line: how many organizations were eligible, how many were excluded.
  2. The **excluded** list with the reason against each organization. Read the arrival reason aloud:
     "the trip needs about 85 minutes but only 60 minutes are available before the safe window closes".
  3. The winner card: priority score out of 100, distance, and **"arrives with about 15 minutes to spare"**.

> Say: "Four checks run before any scoring: the organization must be verified, have space, accept
> the category, and be reachable in time. That last check is the rule I added. If the food cannot
> arrive while it is still safe to serve, the organization is excluded, and the reason is stored
> with the decision."

**2b. Allocate the donation you registered (60 seconds).**

- Select **"Veg Pulao & Raita"** in the queue instead.
- Press **Preview decision** again. All verified organizations are within reach of this donor, so
  the ranking is decided by the six weighted factors rather than by the safety constraint. Point
  at the factor bars and read the decision explanation.
- Press **Run & allocate**. The recipient is notified immediately.

### Part 3. The recipient organization sees the allocation (Window B, 90 seconds)

Look at the winner card from Part 2b: the engine has named the organization it recommends. In the
private window, sign in with **that** organization's account (see the table above; the account
matches the organization name).

- The dashboard lists the incoming allocation, and the card shows the food,
  quantity, donor name, distance and the priority score.
- Press **Why this match?** The same decision is shown from the recipient's side: the factor bars
  and the explanation.
- Press **Accept allocation**. A volunteer is matched and assigned automatically; the card now
  shows the volunteer's name and phone number.
- Optional, 20 seconds: open **Demand & preferences**, change the registered demand, and save. This
  is one of the engine's inputs, and the recipient controls it.

> Say: "The recipient sees only its own allocations and its own demand profile. It never sees the
> platform's other data. When it accepts, the system assigns the best available volunteer on its own."

### Part 4. The volunteer collects and delivers (Window B, 90 seconds)

The recipient's card names the volunteer the platform assigned automatically. Sign out and sign in
with **that** volunteer's account (see the table above).

- Show the assignment card: the pickup address, the drop-off address, the route distance, the
  match score of about 88 out of 100 and the written reason the engine chose this volunteer.
- Press **Accept task**, then **Start pickup**, then **Mark in transit**, then **Mark delivered**,
  pausing on each step.

> Say: "The volunteer's queue is matched by distance, current workload and experience. Each status
> change notifies the donor and the recipient, and the delivery is tracked from pickup to handover."

### Part 5. The recipient confirms, and the whole record closes (Window B, then Window A, 60 seconds)

- Stay in the volunteer window only long enough to note that the assignment now reads
  *Delivered, waiting for the recipient to confirm*.
- Sign out, sign in as the same recipient organization again, and press **Confirm receipt**.

> Say: "The recipient closes the loop. That single action completes the donation, adds one to the
> volunteer's completed deliveries, increases the recipient's storage load, reduces its demand,
> and writes notifications and audit entries for everyone involved."

Now switch to **Window A**:

- **Sign in as the donor** (the account that registered the food). The same donation now reads
  **Completed**, and the card shows the recipient organization, the priority score out of 100 and
  the volunteer's name. Open **Details** to show the lifecycle timeline and the stored decision
  explanation.

> Say: "This is the same record, seen by the donor: who received it, who delivered it, the score
> the engine gave it, and the reason it was chosen."

- **Sign in as the administrator** again and finish on the oversight screens:
  - **Command Center**: the rescued total and the pipeline have moved.
  - **Reports & Analytics**: point at the 14-day trend and the fairness chart. Explain that
    organizations that received less in the last 30 days score higher on the fairness factor, so
    distribution balances over time.
  - **Audit & System**: the audit trail lists the whole sequence, with the actor and the timestamp
    for each step.

> Say: "This is the accountability the requirements asked for. Every action is recorded, and every
> allocation keeps the score and the reasoning behind it."

### Part 6. Two short closing demonstrations (60 seconds)

**Role enforcement is on the server, not just the interface.**
In Window A, sign in as the donor and type `/admin` in the address bar. The application returns you
to the donor workspace, and the API answers with `403 Forbidden` for that role.

> Say: "A donor cannot read platform data even by guessing the URL, because the server checks the
> role and the ownership of every record."

**Notifications are per role.**
Open the bell in each window. Each account received only its own messages, and the unread badge
counts what it has not read yet.

---

## 3. Four things worth pausing on

1. **The arrival rule.** Slide 6 and Part 2 show the same decisions. This is the contribution you
   can defend: the three assumptions and the change from a score to a hard constraint.
2. **The decision explanation.** Every allocation stores a written reason, visible to the
   administrator, the donor and the recipient. Most platforms store no justification at all.
3. **Automatic volunteer assignment.** The recipient accepts, and the platform assigns the best
   available volunteer without the donor or the recipient arranging anything.
4. **The audit trail.** Walk down the list: registration, allocation, acceptance, pickup, transit,
   delivery, confirmation. Each row names the actor and the time.

---

## 4. If something goes wrong

| Symptom | Recovery |
|---|---|
| Numbers look stale or the demo donation is missing | **Audit & System → Restore sample data**, then continue |
| "Catering Excess – Veg Pulo" has expired | Register a fresh cooked meal with the **+2h** preset as the donor. The engine behaves identically |
| A page shows an error | Reload the window. The server is unaffected |
| The API is not responding | Run `./scripts/start-all.sh` again, then reload |
| You need one complete rescue in a single action | `curl -X POST http://localhost:8080/api/admin/sample-data/scenario -H "Authorization: Bearer <admin token>"`. Use this only as a recovery move, then carry on manually |

---

## 5. Questions sir is likely to ask

**"What is your own contribution?"**
The food-safety arrival rule. The engine estimates pickup to handover time from the distance and a
handling allowance, compares it with the remaining safe window, keeps sixty minutes free for
serving, and excludes organizations that cannot arrive in time. It began as a distance score and
became a hard constraint, because late arrival is a safety failure rather than a lower priority.
The three assumptions are in `docs/DESIGN_DECISIONS.md`.

**"How is this different from existing donation platforms?"**
They list a donation and let the first organization claim it. Here every eligible organization is
ranked, unsafe assignments are excluded, recent distribution affects the score, every decision
carries a written explanation, and all actions are audited.

**"How is the volunteer chosen?"**
55 percent proximity to the pickup point, 25 percent current workload and 20 percent completed
deliveries, with the reason stored on the assignment.

**"Is the data real or hardcoded?"**
Everything on screen is read from MySQL. The demonstration writes real rows: the donation, the
allocation with its factor breakdown, the volunteer assignment, the delivery timestamps,
notifications and audit entries. `GET /actuator/health` shows the live database connection.

**"What is missing?"**
Stated on slide 10: straight line distances rather than road routing, one average travel speed for
all vehicles, no map input or GPS streaming, in-app notifications only, a small single city
dataset, and fixed weights rather than a model trained on real history. Each limitation has a
matching item in the future work list.

**"What is the tech stack?"**
React 19 and TypeScript on the front end, Spring Boot 4 on Java 21 with Spring Security and JWT,
Spring Data JPA over MySQL 26 on the back end. The same stack listed in the requirements document.
