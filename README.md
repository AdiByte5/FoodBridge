# FoodBridge
### An Intelligent Food Rescue Coordination and Resource Allocation Platform

**Adithyan S Nair · 24BAI1621**

Restaurants, hotels, supermarkets and caterers throw away surplus food that is still perfectly
safe to eat, while NGOs, food banks and shelters struggle to meet demand. FoodBridge doesn't
just connect donors with recipients — its **Intelligent Allocation & Decision Engine** scores
every verified recipient across six weighted factors, recommends the best match, explains the
decision in plain English, coordinates the closest volunteer and tracks the rescue all the way
to a confirmed delivery.

![Scenario runner](docs/screenshots/05-scenario-timeline.png)

---

## Quick start

```bash
./scripts/start-all.sh      # MySQL (3307) + Spring Boot API (8080) + React app (5173)
```

Then open **http://localhost:5173** and sign in with any sample account:

| Role | Email | Password | Represents |
|---|---|---|---|
| Administrator | `admin@foodbridge.org` | `Admin@123` | Platform oversight |
| Donor | `donor@foodbridge.org` | `Donor@123` | Spice Route Restaurant |
| Recipient Organization | `recipient@foodbridge.org` | `Recipient@123` | Akshaya Patra Community Kitchen |
| Volunteer | `volunteer@foodbridge.org` | `Volunteer@123` | Ravi Kumar (Bike) |

Stop everything with `./scripts/stop-all.sh`.

<details>
<summary>Manual setup (three terminals)</summary>

```bash
# 1. database — dedicated MySQL 26.7 instance on port 3307, data in ~/.foodbridge/mysql-data
./scripts/start-mysql.sh

# 2. backend — Spring Boot 4 / Java 21 REST API on :8080
cd backend && ./mvnw spring-boot:run

# 3. frontend — React 19 + Vite dev server on :5173 (proxies /api to :8080)
cd frontend && npm install && npm run dev
```

No MySQL handy? Run the API with the embedded H2 profile instead:
`cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=h2`
</details>

The database seeds itself on first boot with a realistic Bengaluru scenario — 5 donor
businesses, 6 recipient organizations, 4 volunteers and two weeks of donation history.
Admin → **Audit & System** can restore that sample dataset at any time.

---

## Core features

1. **User authentication & role management** — JWT login with role-based access for donors,
   recipient organizations, volunteers and administrators. Anyone can sign up from the
   **Create account** page; donors can be a restaurant, hotel, supermarket, bakery, caterer,
   company, NGO — or an individual donating personally.
2. **Food donation management** — donors register surplus food with category, quantity, expiry
   window, storage requirement and pickup point, modify or cancel it while it is still pending,
   and track it through its lifecycle.
3. **Recipient management** — organizations maintain their demand, storage capacity,
   beneficiaries and accepted food categories; all of it feeds the engine.
4. **Intelligent Allocation & Decision Engine** — eligibility filters plus six weighted factors
   produce a ranked recommendation: expiry urgency 25%, demand match 20%, storage fit 15%,
   proximity 15%, food preference 15%, fairness 10%.
5. **Priority-based decision scoring** — every allocation stores its 0–100 score and the exact
   per-factor breakdown that produced it.
6. **Fair resource distribution** — the fairness factor scores recipients by kilograms received
   in the last 30 days so distribution stays balanced, measured on the analytics dashboard.
7. **Smart volunteer coordination** — volunteers are matched by proximity (55%), current load
   (25%) and experience (20%), with a written match explanation.
8. **Delivery tracking** — pickup → in transit → delivered → recipient confirmation, updating
   storage load, volunteer records and the donation status.
9. **Notification & tracking** — in-app notifications for every lifecycle event, plus automated
   expiry alerts.
10. **Reports & analytics** — rescue KPIs, 14-day trend, category mix, pipeline funnel, fairness
    distribution, volunteer leaderboard and CSV export.
11. **Administrative oversight** — organization verification, user management, audit logs and
    live system health.
12. **Profile management** — every role can update their name, phone and address from the
    account page; volunteers also manage their vehicle, recipients manage demand from their
    dashboard.

**Eligibility filters** run before scoring: only verified organizations, only recipients with
enough free storage, and only organizations that accept that food category.

---

## Screenshots

| | |
|---|---|
| ![Login](docs/screenshots/01-login.png) | ![Command center](docs/screenshots/02-command-center.png) |
| ![Allocation engine](docs/screenshots/03-allocation-engine.png) | ![Analytics](docs/screenshots/04-analytics.png) |
| ![Recipient dashboard](docs/screenshots/07-recipient-dashboard.png) | ![Volunteer hub](docs/screenshots/08-volunteer-hub.png) |

More in [`docs/screenshots/`](docs/screenshots/) — donor workspace, scenario runner timeline
and the analytics detail views.

---

## Architecture

Matches the submitted Lab 3 system architecture diagram — layered, modular, and each layer maps
1:1 to a folder in the repo.

```
┌───────────────────────────────────────────────────────────────────────┐
│ Presentation Layer · React 19 + TypeScript + Tailwind v4 + Recharts   │
│  Login · role dashboards · allocation engine · analytics · scenarios  │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ REST + JWT (Bearer)
┌───────────────────────────────▼───────────────────────────────────────┐
│ Application Layer · Spring Boot 4 REST controllers                    │
│  Auth · Donation · Recipient · Volunteer · Allocation · Notification  │
│  Analytics · Admin · Scenario                                         │
├───────────────────────────────────────────────────────────────────────┤
│ Business Logic Layer · services & rules                               │
│  AuthService · DonationService · RecipientService · VolunteerService  │
│  DeliveryService · AnalyticsService · AdminService · DataSeeder       │
│  ★ AllocationEngineService — filters, weighted scoring, fairness,     │
│    volunteer matching, decision explanations                          │
├───────────────────────────────────────────────────────────────────────┤
│ Data Access Layer · Spring Data JPA repositories                      │
├───────────────────────────────────────────────────────────────────────┤
│ MySQL 26.7 · database `foodbridge` · 12 entities (3NF)                │
└───────────────────────────────────────────────────────────────────────┘
```

**Security:** Spring Security 7 with a stateless JWT filter, BCrypt password hashing,
role-based authorization (`ADMIN`, `DONOR`, `RECIPIENT`, `VOLUNTEER`) on both endpoints
and method level, plus per-record ownership checks (a recipient can only accept *its own*
allocations, a volunteer only *its own* assignments).

## Database — the 12 entities from the ER diagram

`User` (parent, 1:1 role profiles) → `Donor`, `RecipientOrganization`, `Volunteer`.
`FoodDonation` (N:1 donor, N:1 category) → `Allocation` (1:1 donation, N:1 recipient) →
`VolunteerAssignment` (1:1 allocation, N:1 volunteer) → `Delivery` (1:1 assignment).
Supporting: `FoodCategory`, `RecipientPreference` (bridge for M:N), `Notification`, `AuditLog`.

## Class diagram mapping

The submitted class diagram is implemented directly: `User` (parent with common fields),
`Donor`, `RecipientOrganization`, `Volunteer`, `Administrator`, `FoodDonation`,
`FoodCategory`, `Allocation`, `VolunteerAssignment`, `Delivery`, `Notification`, `AuditLog`
and the independent `AllocationEngine` service, plus the `UserRole`, `DonationStatus`,
`AssignmentStatus`, `DeliveryStatus` enumerations and composition chains
(`FoodDonation → Allocation → VolunteerAssignment → Delivery`).

---

## Use cases implemented

| Actor | Use cases |
|---|---|
| Donor | Authenticate · manage profile · register, modify and cancel donations · preview the engine's recommendation for their own donation · view donation history · receive notifications |
| Recipient Organization | Update food demand & capacity · view available allocations · accept allocation · confirm delivery · manage food preferences |
| Volunteer | Update availability · manage assignments · accept/decline · track delivery (pickup → in transit → delivered) |
| Administrator | Verify organizations · manage users · monitor system (health + audit) · generate reports (CSV export) · view audit logs |

## Who sees what

| Workspace | Screens |
|---|---|
| Donor | Donor dashboard (own donations, preview match, history) · Notifications |
| Recipient organization | Recipient dashboard (incoming allocations, demand & preferences) · Notifications |
| Volunteer | Volunteer hub (availability, assignments, delivery tracking) · Notifications |
| Administrator | Command center · Allocation engine · Scenario runner · Reports & analytics · Users & verification · Audit & system · Notifications |

Every endpoint is enforced server-side as well (401 without a token, 403 for the wrong role),
so a donor can never read platform-wide allocation or analytics data.

## Scenario runner

Admin → **Scenario Runner** executes the complete production workflow against the live system in
10 narrated steps:

`Donation registered → Engine evaluates 6 factors → Allocation proposed → Recipient accepts →
Volunteer matched & accepted → Pickup started → In transit → Delivered → Receipt confirmed →
Analytics updated`

Every step writes real rows to MySQL, sends in-app notifications and appends to the audit log.
A presentation run sheet is in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

---

## REST API (summary)

| Method & path | Purpose |
|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` | JWT authentication & profile |
| `GET/POST /api/donations` · `POST /api/donations/{id}/cancel` · `GET /api/donations/expiring` | Donation lifecycle |
| `POST /api/allocations/engine/{donationId}/preview` · `/run` | Run the decision engine (ranked, explained) |
| `GET /api/allocations` · `/{id}/accept` · `/{id}/reject` · `/{id}/confirm-delivery` | Allocation decisions |
| `GET /api/allocations/{id}/volunteer-matches` · `POST /{id}/assign-volunteer` | Smart volunteer coordination |
| `GET /api/recipients` · `/me` · `PATCH /me/demand` · `GET/PUT /me/preferences` | Recipient demand & preferences |
| `GET /api/volunteers` · `/me/assignments` · `POST /assignments/{id}/{accept,decline,start,in-transit,delivered}` | Volunteer & delivery tracking |
| `GET /api/notifications` · `/unread-count` · `POST /{id}/read` · `/read-all` | Notification center |
| `GET /api/analytics/overview` · `GET /api/analytics/export/donations.csv` | Reports & analytics |
| `GET /api/admin/users` · `POST /users/{id}/verify` · `PATCH /users/{id}/status` · `GET /audit-logs` · `GET /system-health` | Admin oversight |
| `POST /api/scenario/run` · `POST /api/scenario/reset` | Scenario runner & sample data restore |

Public: `GET /api/public/categories`, `/engine-weights`, `/platform-stats`.
Health: `GET /actuator/health`.

---

## Project structure

```
FoodBridge/
├── backend/                     Spring Boot 4 API (Java 21)
│   └── src/main/java/com/foodbridge/
│       ├── domain/              12 JPA entities + 10 enums
│       ├── repo/                Spring Data repositories
│       ├── service/             business logic incl. the allocation engine
│       ├── web/                 REST controllers
│       ├── security/            JWT service, filter, principal
│       └── config/              security, CORS, sample data seeding
├── frontend/                    React 19 + TypeScript + Tailwind v4
│   └── src/
│       ├── pages/               login, 4 role workspaces, engine, analytics,
│       │                        users, audit/system, scenario runner
│       ├── components/          app shell, charts, recommendation panel, UI kit
│       ├── store/               auth context
│       └── lib/                 axios client, typed DTOs, formatters
├── scripts/                     start-all / start-mysql / stop-all
├── docs/
│   ├── screenshots/             UI screenshots
│   └── DEMO_SCRIPT.md           presentation walkthrough
└── preContent/                  the original submitted lab PDFs
```

## Running the tests

```bash
cd backend && ./mvnw test
```

Eight automated tests run against an in-memory H2 database, so they do not touch your MySQL data:

- **AllocationEngineServiceTest** — eligibility filters (unverified, insufficient storage, category
  mismatch), weighted scoring and factor totals, and the fairness factor preferring the
  organization that received less.
- **ApiAccessTest** — unauthenticated requests return 401, a donor is blocked from admin-only
  endpoints with 403, recipients only reach their own allocations, the administrator can read
  platform data, and an individual can sign up as a donor under their own name.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Port 8080 already in use` | `./scripts/stop-all.sh` then start again |
| API starts but data looks empty | Admin → **Audit & System** → *Restore sample data* |
| MySQL will not start | Check `~/.foodbridge/run/mysqld.log`; make sure nothing else uses port 3307 |
| Want a zero-install database | Run the API with `-Dspring-boot.run.profiles=h2` |

---

*Course: PTPS — project deliverables Lab 1–8 (synopsis, requirements, architecture, ER model,
use case & class diagrams, sequence & activity diagrams, component & collaboration diagrams,
context & data-flow diagrams). This repository is the working implementation of those designs.*
