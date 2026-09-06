# Royal Square Financial — Platform Foundations

Prototype foundations for the Royal Square Financial brokerage platform, built from the
*PostgreSQL Data Architecture, Schema Design & Platform Blueprint*.

This repository contains three independently useful parts. **None of them touch AWS or
spend credits** until you explicitly choose to deploy.

```
royal-square/
├── agent/     # Koisa — dual-mode Bedrock conversational agent (JSON + Python)
├── db/        # PostgreSQL 16 migrations + seeds (validated locally in Docker)
└── infra/     # Terraform for AWS (plan-only; never applied here)
```

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
