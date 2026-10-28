# Lab 09 submission details

**Course:** Software Engineering Laboratory (PTPS)  
**Team:** AdiByte5  
**Member:** Adithyan S Nair, 24BAI1621  
**Project:** FoodBridge, an intelligent food rescue coordination and resource allocation platform

This note collects the links, setup steps and credentials that the Lab 09 submission needs. The
repository README has the full project description; this page is the short version to submit or
paste into Teams.

## Deliverables

| Deliverable | Where |
|---|---|
| Presentation (PPTX) | `docs/AdiByte5_FoodBridge_Presentation.pptx` |
| Presentation (PDF) | `docs/AdiByte5_FoodBridge_Presentation.pdf` |
| Source code | https://github.com/25-26-WIN-BCSE301L-SOFTWARE-ENGINEERING/26-27-fall-se-lab-projects-AdiByte5 |
| Public copy of the code | https://github.com/AdiByte5/FoodBridge |
| Demo video | Record the walkthrough, upload it to Teams, and set sharing to "Anyone with the link can view" |
| Live application | Not publicly deployed. The working application runs locally at http://localhost:5173 |

All links must be viewable by anyone with the link before the submission is uploaded.

## Running the project locally

Requirements: Java 21, Node.js 20 or newer, npm, and MySQL 8 or newer.

```bash
cd FoodBridge
./scripts/start-all.sh
```

The script starts MySQL on port 3307, the Spring Boot API on port 8080 and the React application
on port 5173. Open http://localhost:5173 in a browser. Stop everything with
`./scripts/stop-all.sh`.

Manual start, if the script is not suitable:

```bash
./scripts/start-mysql.sh
cd backend && ./mvnw spring-boot:run
cd frontend && npm install && npm run dev
```

The API can also run without a local MySQL server:

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=h2
```

## Environment variables

The defaults match the local demo. Override them in the shell or in the IDE run configuration.
Do not commit real passwords or keys.

| Variable | Default | Purpose |
|---|---|---|
| `FOODBRIDGE_DB_URL` | `jdbc:mysql://127.0.0.1:3307/foodbridge?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata` | Database connection |
| `FOODBRIDGE_DB_USER` | `foodbridge` | Database user |
| `FOODBRIDGE_DB_PASS` | `foodbridge123` | Database password (demo value) |
| `FOODBRIDGE_JWT_SECRET` | development key in `application.properties` | JWT signing key; replace it for any real deployment |
| `FOODBRIDGE_DEMO_SEED` | `true` | Load the sample dataset on first boot |
| `FOODBRIDGE_ENGINE_AUTOALLOCATE` | `true` | Match new donations automatically; `false` restores manual allocation |

The properties live in `backend/src/main/resources/application.properties`. Spring reads the
environment variables above in preference to that file.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@foodbridge.org` | `Admin@123` |
| Donor (Spice Route Restaurant) | `donor@foodbridge.org` | `Donor@123` |
| Recipient (Akshaya Patra) | `recipient@foodbridge.org` | `Recipient@123` |
| Recipient (Chennai Food Bank) | `foodbank@foodbridge.org` | `Recipient@123` |
| Volunteer (Ravi Kumar) | `volunteer@foodbridge.org` | `Volunteer@123` |

## What the demonstration shows

1. A donor registers surplus food. The allocation engine matches a recipient immediately and shows
   the score and the reason.
2. The administrator opens the decision, sees the ranked organizations and the filters, and can
   change the recipient with a written reason. The original decision is kept.
3. The new recipient accepts the allocation, the closest volunteer is assigned, and the delivery
   moves through pickup, transit, delivery and confirmation.
4. Reports and the audit trail update with the rescue.

The detailed click-by-click run sheet is in `docs/DEMO_SCRIPT.md`.

## Verification

```bash
cd backend && ./mvnw test
```

Fifteen tests run against an in-memory H2 database. They cover the eligibility filters, weighted
scoring, fairness, the food-safety arrival rule, role-based access, automatic matching, the waiting
queue, the administrator override and volunteer assignment.

## Submission checklist

- [ ] Repository is shared with the course account and opens without a login.
- [ ] `README.md` shows the setup, environment variables and run commands.
- [ ] Presentation is named `AdiByte5_FoodBridge_Presentation` and uploaded as PPTX or PDF.
- [ ] Demo video is under ten minutes and uploaded directly to Teams.
- [ ] Video and any slide links are set to "Anyone with the link can view".
- [ ] Sample data loaded once before recording, so the dashboards are populated.
