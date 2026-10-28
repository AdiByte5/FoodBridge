# FoodBridge live demonstration

The deck explains the design. This run sheet shows the working system: a donation is matched
automatically, the administrator reviews and can change the decision, the recipient accepts, a
volunteer delivers, and the reports and audit trail update.

Plan about 4 minutes for the eleven slides and about 6 minutes for the demonstration.

---

## 1. Setup, five minutes before presenting

1. Start the stack: `./scripts/start-all.sh`, or double-click **FoodBridge.command** on the Desktop.
   Wait for **"FoodBridge is running"**.
2. Sign in as the administrator and open **Audit & System → Restore application data**. Do this
   immediately before presenting, so the waiting donations and the safety-rule example are current.
3. Open **two browser windows**:
   - Window A: a normal window for the administrator and the donor.
   - Window B: a **private window** (Chrome: Command-Shift-N) for the recipient and the volunteer.

   Signing in as a second role in the same window replaces the first session.
4. In Window A open **Command Center**. In Window B open `localhost:5173/login`.
5. Keep this page open on your phone or a second screen.

**Accounts** (every password follows the pattern Role@123):

| Role | Sign in as |
|---|---|
| Donor: Spice Route Restaurant | `donor@foodbridge.org` / `Donor@123` |
| Recipient: Akshaya Patra Kitchen | `recipient@foodbridge.org` / `Recipient@123` |
| Recipient: Chennai Food Bank | `foodbank@foodbridge.org` / `Recipient@123` |
| Recipient: Sneha Sadan Orphanage | `orphanage@foodbridge.org` / `Recipient@123` |
| Recipient: Anand Ashram Shelter | `shelter@foodbridge.org` / `Recipient@123` |
| Recipient: Sanjeevini Community Kitchen | `kitchen@foodbridge.org` / `Recipient@123` |
| Volunteer: Ravi Kumar | `volunteer@foodbridge.org` / `Volunteer@123` |
| Volunteer: Priya Sharma | `priya@foodbridge.org` / `Volunteer@123` |
| Volunteer: Arjun Mehta | `arjun@foodbridge.org` / `Volunteer@123` |
| Administrator | `admin@foodbridge.org` / `Admin@123` |

**Check before starting.** On the Allocation Engine page, the **Waiting for a match** card should
list two donations:

- **Late Night Buffet Surplus**, 12 kg, about one hour left. No organization can reach it inside
  the safe window.
- **Bulk Bakery Order - Cancelled**, 450 kg. It is larger than the free storage of every verified
  organization.

If they are missing, restore the sample data again.

---

## 2. The walkthrough

### Part 1. The donor registers surplus food (Window A, 60 seconds)

Sign out if needed. On the login page press **Donor** and **Sign in**.

- Point at the sidebar: a donor sees only their own workspace and notifications. No engine page
  and no reports.
- Press **Register donation** and enter:
  - Food: `Veg Biryani & Raita`
  - Category: `Cooked Meals`
  - Quantity: `12` kg
  - Expiry: the **+2h** or **+6h** preset
  - Storage: `Hot holding`
  - Notes: `Freshly prepared surplus from the lunch service`
- Press **Register donation**.

The toast confirms the match and the score. The new card is already **Allocated**, with the
recipient name and the priority score.

> Say: "The donor registers the food and the platform makes the decision immediately. The donor is
> not choosing a recipient, and does not see other organizations or other donations."

### Part 2. The administrator reviews the decision (Window A, 90 seconds)

Sign out, sign in as **Administrator**, and open **Allocation Engine**.

- In **Awaiting recipient acceptance**, find **Veg Biryani & Raita** and press **Decision**.
- Walk down the right-hand panel:
  1. the summary: how many organizations were eligible and excluded;
  2. the winner card: priority score, distance, free storage and minutes to spare;
  3. the six factor bars and the written explanation.
- Press **Change** on the same row. The dialog lists every organization with the score the engine
  gave it, and greys out the ones it ruled out.
- Choose **Chennai Food Bank**, type a reason such as
  `Coordinator confirmed they can collect it this afternoon`, and press **Confirm change**.

> Say: "The engine decides automatically, but a coordinator may know something the data does not.
> The administrator can change the recipient here. The record keeps the engine's score, the
> previous organization, the new organization and the reason, and all three parties are notified."

### Part 3. Why some donations wait (Window A, 45 seconds) — the safety rule

Still on the Allocation Engine page:

- Select **Late Night Buffet Surplus** and press **Preview decision**. Every organization is
  excluded because the trip needs longer than the one hour left, including handling time.
- Select **Bulk Bakery Order - Cancelled** and press **Preview decision**. Every organization is
  excluded because 450 kg is more than the free storage anywhere on the platform.

> Say: "The platform refuses to promise food it cannot deliver safely. These two are genuinely
> waiting. The queue is retried automatically when an organization frees storage or is verified."

### Part 4. The recipient sees and accepts the allocation (Window B, 60 seconds)

In the private window, sign in as **Chennai Food Bank** (`foodbank@foodbridge.org`).

- The incoming allocation shows the food, quantity, donor, distance and priority score.
- Press **Accept allocation**. A volunteer is matched and assigned automatically.
- Point out the volunteer name and phone number on the card.

> Say: "The recipient sees only its own allocations and its own demand profile. When it accepts,
> the system assigns the best available volunteer without anyone arranging it by phone."

### Part 5. The volunteer collects and delivers (Window B, 90 seconds)

Sign out and sign in as the volunteer named on the card.

- Show the assignment: pickup and drop-off, route distance, match score and the written reason.
- Press **Accept task**, then **Start pickup**, then **Mark in transit**, then **Mark delivered**.

> Say: "Volunteers are matched by distance, current workload and experience. Every status change
> notifies the donor and the recipient and is recorded in the audit trail."

### Part 6. Confirmation and reports (Window B, then Window A, 45 seconds)

- Sign out and sign back in as **Chennai Food Bank**. Press **Confirm receipt**.
- In Window A open **Reports & Analytics**. The rescued kilograms, meals and acceptance rate move.
- Open **Audit & System → Audit log** and show the two key lines:
  - `ENGINE_ALLOCATED` with actor **system**, the automatic decision;
  - `ALLOCATION_OVERRIDDEN` with actor **Adithyan S Nair**, the change and its reason.

> Say: "One confirmation closes the loop: the donation completes, the volunteer's completed count
> and the recipient's storage figures update, and the audit trail keeps every decision."

---

## 3. Recovery during the demonstration

| Situation | What to do |
|---|---|
| The engine picks another recipient | Continue with that organization's account from the table. For the override, still choose **Chennai Food Bank** so you know the login. |
| No volunteer was assigned | On the Allocation Engine page, find the accepted allocation and press **Assign**. The best available volunteer is chosen. |
| Your new donation stays in the waiting queue | Press **Preview decision** and read the exclusion reason. If it is storage, open the recipient's dashboard, raise the storage capacity and save; the queue retries automatically. |
| The screen shows the wrong data | Sign in as administrator and use **Audit & System → Restore application data**. This wipes donations you added manually. |
| A page looks stale | Refresh once. The two windows share the server, so the other window already has the new state. |

## 4. Short answers if asked

**Is the engine AI?** No. It is a rule-based decision engine. It applies hard eligibility filters,
then six explicit weights, ranks the eligible organizations and stores a written explanation. The
weights and rules can be inspected and defended; a trained model could not explain a decision with
this project's data.

**What is original here?** The food-safety arrival rule: estimated travel plus handling is compared
with the remaining safe window minus a serving buffer. Food that cannot arrive safely is excluded
before scoring. The override-with-reason record is the second design choice.

**What is left?** Road routing and live traffic, map-based location entry, GPS tracking, deployment
and SMS notifications. These are listed as future work in the deck.
