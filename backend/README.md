# Royal Square Financial — Backend

**Version:** 2.0.0 · **Runtime:** Node.js ≥ 18 · **Framework:** Express · **DB:** PostgreSQL 16 (Sequelize) · **Cache/Queue:** Redis (Bull) · **Region:** `af-south-1`

Multi-tenant financial-services API for clients, policies, claims, documents, compliance
and medical data — built with security, POPIA compliance, and auditability as first-class
concerns. Hosts the **Koisa** AI assistant with strict data-access guardrails.

---

## Quick start

```bash
cp .env.example .env            # adjust as needed (af-south-1 defaults are set)
npm install
docker compose up -d            # api + PostgreSQL 16 + Redis
npm run migrate                 # apply SQL migrations + seeds
npm start                       # or: npm run dev
npm run worker                  # background workers (separate process)
```

Verify without any external services:

```bash
npm run check                   # static require-graph load check (25 checks)
npm test                        # unit + in-process HTTP tests (18 tests)
```

---

## What's new in this build

- **Koisa is locked down (no PII access).** The assistant can only ever read the tools it is
  given for the active mode, is explicitly barred from personal/sensitive data, and warns
  users not to share sensitive information. See [Koisa](#koisa-ai-assistant) below.
- **Consent forms & T&Cs are stored as first-class documents.** `POST /documents/consent`
  stores the signed artefact in S3 (KMS-encrypted) and links the client's acceptance
  (`consents.evidence_document_id`) to the exact stored version.
- **af-south-1 (Cape Town) by default** for POPIA §72 data residency.
- **Control-gate / adviser staging workflow** (`/workflow/approval/*`): client submissions
  are reviewed and approved before any dispatch to third-party providers.

---

## Architecture

```
Client / Frontend
   │  TLS
   ▼
Express (app.js)
   │  helmet → cors → compression → requestContext → logger → rateLimit
   ▼
Routes (/api/v1/*, /webhooks/*)  →  Controllers  →  Services  →  PostgreSQL / Redis / S3 / KMS
                                                        │
                                                   Bull workers (notifications, integrations)
```

## Project structure

```
src/
├── app.js / server.js         # app wiring + entry point (graceful shutdown)
├── config/                    # config, logger (PII-redacting), database (RLS ctx), redis, aws, encryption
├── models/                    # 22 Sequelize models + associations
├── migrations/                # 001_init, 002_seed, 003_constraints, 006_seed + run.js
├── middleware/                # auth, rbac, validation, rateLimiter, audit, requestContext, logger, errorHandler
├── services/                  # business logic by domain (see below)
├── controllers/ · routes/     # thin HTTP layer
├── validators/                # Joi schemas
├── workers/                   # Bull queue + notification/integration workers
└── utils/                     # errors, respond helpers
```

---

## Configuration

Set via environment (see `.env.example`). Highlights (full table unchanged from v2.0.0):

| Variable | Default | Notes |
|---|---|---|
| `AWS_REGION` | `af-south-1` | Data residency (POPIA §72) |
| `DB_*` | — | PostgreSQL 16 connection |
| `REDIS_*` | — | Cache / queues / token blacklist |
| `JWT_SECRET` | — | ≥ 32 chars (required in prod) |
| `ENCRYPTION_KEY` | — | 32-byte AES key (dev); KMS envelope in prod |
| `KMS_KEY_ID` / `KMS_MEDICAL_KEY_ID` | — | Separate keys per data classification |
| `S3_BUCKET` | — | Private, versioned, KMS-encrypted document bucket |
| `BEDROCK_MODEL_ID` | `anthropic.claude-sonnet-5-…` | Koisa model |
| `ENABLE_MEDICAL_MODULE` / `ENABLE_CLAIMS_MODULE` / `ENABLE_INTEGRATION_SIMULATION` | flags | |

---

## API reference (additions & changes)

Base URL: `/api/v1`. All routes except `/auth/*` and `/koisa/chat` require a Bearer JWT.
Error shape: `{ "error": { "message", "code", "details", "requestId" } }`.

### Koisa — `/api/v1/koisa`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/chat` | Optional | Chat with Koisa. Anonymous → public mode; valid JWT → authenticated dashboard mode. |

### Documents — `/api/v1/documents`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/:clientId` | `DOCUMENT_READ` | List client documents |
| POST | `/upload` | `DOCUMENT_WRITE` | Upload a document (S3 + KMS) |
| POST | `/consent` | `DOCUMENT_WRITE` | **Store a consent form / T&Cs and record the acceptance** |
| GET | `/:documentId/download` | `DOCUMENT_READ` | Short-lived presigned download URL |
| DELETE | `/:documentId` | `DOCUMENT_WRITE` | Soft-delete a document |

`POST /documents/consent` body:

```json
{
  "clientId": "<uuid>",
  "typeCode": "TERMS_AND_CONDITIONS",
  "title": "RSF Terms and Conditions v3",
  "contentBase64": "<base64 of the PDF>",
  "mimeType": "application/pdf",
  "consent": {
    "purposeCode": "TERMS_AND_CONDITIONS",
    "purposeDescription": "Client accepted the platform T&Cs",
    "version": "3.0",
    "granted": true
  }
}
```

### Workflow / approval — `/api/v1/workflow`

Adds the control-gate: `POST /approval/submit`, `GET /approval/pending`,
`PUT /approval/:entityType/:entityId/approve|reject`, `GET /approval/:entityType/:entityId/status`.

Other domains (`/auth`, `/clients`, `/financial`, `/policies`, `/claims`, `/compliance`,
`/audit`, `/webhooks/:provider`) follow the v2.0.0 reference.

---

## Koisa AI assistant

Koisa is a dual-mode Bedrock assistant. Its data access is constrained by controls that run
in the backend and do **not** depend on the model behaving:

- **Mode gating.** `public` (unauthenticated) exposes only `get_public_faqs`,
  `get_product_catalog`, `get_company_info`. `authenticated` exposes
  `get_client_dashboard_summary`, `navigate_to_tab`, `get_policy_details`. The two toolsets
  are disjoint; `assertToolAllowed` rejects any cross-mode call.
- **No PII.** A global denied-data list (ID/passport/tax numbers, bank/card details, full
  policy numbers, DOB, address/email/phone, medical data, credentials, and the DB ciphertext
  columns) is stripped from **every** tool result by `redactDenied` *before* it reaches the
  model. Authenticated tools read the DB inside an RLS-scoped transaction
  (`SET LOCAL app.current_user_id`), so a client only ever sees their own data, and only
  non-sensitive summary fields are ever returned.
- **User protection.** Each message is screened; if a user appears about to share sensitive
  information, Koisa returns a warning and does **not** process the message. Matched values
  are never logged or echoed.

The canonical policy lives in `../agent/config/modes.json`; `services/koisa/guardrails.js`
loads it (with a self-contained fallback) so the backend enforces the same rules.

---

## Security & compliance

- **Field-level encryption**: AES-256-GCM; KMS envelope encryption in production (per-record
  data keys, wiped after use). ID/passport/tax/bank/policy numbers and all medical data are
  encrypted; only masked forms are ever returned.
- **Medical data** is a separate high-security domain (dedicated KMS key, KMS-encrypted
  payload, excluded from ordinary queries and from Koisa entirely).
- **Immutable audit trail** (`audit_events`, DB trigger blocks UPDATE/DELETE); before/after
  payloads are redacted before insertion.
- **RBAC**: `CLIENT_READ` does **not** grant `MEDICAL_READ` or `BANKING_READ`.
- **Logs** are PII-redacting by construction.

---

## Testing

- `npm run check` — offline require-graph load check (25 checks).
- `npm test` — 18 tests (RBAC matrix, Koisa gating/redaction/warning, encryption round-trip,
  financial math, and in-process HTTP: health, 404/validation/auth error shapes, Koisa chat).
- Migrations validated against a real `postgres:16` container (24 tables; consent document
  types present).

---

## Docker & deployment

Multi-stage Dockerfile (non-root, healthcheck on `/health`). `docker-compose.yml` runs the
API with PostgreSQL 16 + Redis. See `scripts/deploy.sh` and `scripts/healthcheck.sh`.

## CI/CD

`.github/workflows/push-backend.yml` force-pushes `main` to the `backend` branch of the
system repo on every push. `GITHUB_TOKEN` is provided automatically.
