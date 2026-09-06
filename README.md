# Royal Square Financial — Platform Foundations

Prototype foundations for the Royal Square Financial brokerage platform, built from the
*PostgreSQL Data Architecture, Schema Design & Platform Blueprint*.

This repository contains the application, local runtime, and plan-only infrastructure. **None of
it touches AWS or spends credits** until you explicitly choose to deploy.

```
royal-square/
├── frontend/           # React/Vite client portal and adviser UI
├── backend/            # Node/Express API, migrations, and workers
├── docker-compose.yml  # One-command local frontend + API + PostgreSQL + Redis
├── agent/              # Koisa Bedrock agent contract
├── db/                 # Reference PostgreSQL schema assets
└── infra/              # Terraform for AWS (plan-only; never applied here)
```

## Run the complete application locally with Docker

You do not need to create images manually. From the repository root, Docker Compose builds
the frontend and API images, starts PostgreSQL and Redis, applies backend migrations, and then
starts the application:

```bash
docker compose up --build
```

Open **http://localhost:8080**. The API health endpoint is available at
**http://localhost:3000/health**. The seeded client credentials are:

- Email: `demo.client@royalsquare.co.za`
- Password: `DemoClient123!`

The stack uses separate containers rather than one monolithic image: `frontend`, `api`,
`postgres`, and `redis`. They still start with one command, but remain independently
health-checked and replaceable. Useful commands:

```bash
docker compose ps
docker compose logs api
docker compose down
```

Use `docker compose down -v` only when you intentionally want to delete the local PostgreSQL
and Redis data and rebuild from an empty database. Local fallback credentials in the Compose
file are development-only; set `DB_PASSWORD`, `JWT_SECRET`, and `ENCRYPTION_KEY` in your shell
before startup when the environment is shared.

## 1. `agent/` — Koisa

Koisa is a dual-mode conversational AI agent built on **Amazon Bedrock function calling**
(the Converse API `toolConfig`). It toggles capabilities based on authentication state:

| | Public Landing Page Mode | Authenticated Dashboard Mode |
|---|---|---|
| **Auth scope** | Unauthenticated public users | Authenticated clients (JWT + RLS session) |
| **Data access** | Public knowledge base | Private RDS PostgreSQL (`app.current_user_id`), Redis |
| **Tools** | `get_public_faqs`, `get_product_catalog`, `get_company_info` | `get_client_dashboard_summary`, `navigate_to_tab`, `get_policy_details` |

The agent package is a **framework-agnostic contract**: a system prompt, per-mode tool
gating, Bedrock tool schemas, Python reference handlers wired to the DB views, and an
**offline test harness** that validates everything without calling Bedrock or AWS.

See [`agent/README.md`](agent/README.md).

## 2. `db/` — PostgreSQL 16 schema

Versioned migration sequence (`V001__…` → `V014__…`) plus seed data, matching the
blueprint's domains: identity/access, CRM/households, financial position, providers/
products, planning/advice, workflow, documents, claims, compliance/POPIA, medical
underwriting, immutable audit, dashboard views, indexes.

Validated by running against a real **`postgres:16` Docker container** — this is the key
step that proves the schema before an RDS instance is ever created (no AWS cost).

See [`db/README.md`](db/README.md).

## 3. `infra/` — Terraform (plan-only)

Modular Terraform describing the target AWS footprint: VPC, KMS, RDS PostgreSQL 16,
private/versioned/encrypted S3, ElastiCache Redis, and Secrets Manager. Configured for
`init` + `validate` + `plan` **only**. There is no `apply` in any workflow here.

See [`infra/README.md`](infra/README.md).

## Cost safety

- The database is verified with **local Docker Postgres**, not RDS.
- The agent contract is verified with an **offline Python harness**, not live Bedrock.
- Terraform is limited to **validate/plan**; applying is a deliberate, separate decision.
