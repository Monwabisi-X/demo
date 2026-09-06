# Royal Square Financial — Backend

**Version:** 2.0.0 · **Runtime:** Node.js ≥ 20 · **Framework:** Express · **DB:** PostgreSQL 16 (Sequelize) · **Cache/Queue:** Redis (Bull) · **Region:** `af-south-1`

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
├── migrations/                # Ordered SQL schema/seed files; 010 adds Koisa reader RLS
├── middleware/                # auth, rbac, validation, rateLimiter, audit, requestContext, logger, errorHandler
├── services/                  # business logic by domain (see below)
├── controllers/ · routes/     # thin HTTP layer
├── validators/                # Joi schemas
├── workers/                   # Bull queue + notification/integration workers
└── utils/                     # errors, respond helpers
```

---

## Reminder scheduling and durable delivery

Reminder cadences are a strict calendar whitelist: `1 month`, `3 months`, `6 months`,
`1 year`, or `2 years`. Month-end dates are preserved where possible. Each scheduler tick
materialises at most one due occurrence per rule in PostgreSQL and advances from the scheduled
`next_run_at`, never from execution time. If several occurrences were missed, intermediate
cycles are intentionally skipped and counted; the rule advances to its first future occurrence.

`notifications` is the durable outbox. Bull jobs use the notification UUID as `jobId`; the
worker reconciles queued rows at startup and every minute, including stale processing claims.
A real provider adapter is still required for non-simulated delivery and should pass that UUID
as its provider idempotency key.

The dedicated Lambda artifact is built with Node.js 20:

```bash
npm run build:reminder-lambda   # creates ignored dist/reminder-lambda.zip
```

The build uses the package lock, installs production dependencies into a temporary staging
directory, normalises ZIP metadata, and removes staging output automatically.

---

## Configuration

Set via environment (see `.env.example`). Highlights (full table unchanged from v2.0.0):

| Variable | Default | Notes |
|---|---|---|
| `AWS_REGION` | `af-south-1` | Data residency (POPIA §72) |
| `DB_*` | — | PostgreSQL 16 connection; production `DB_SSL=true` verifies the server with the packaged AWS RDS CA bundle |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis network endpoint; IAM signing never derives the cache ID from this hostname |
| `REDIS_TLS` / `REDIS_AUTH_MODE` | `false` / inferred | Auth mode is `none`, `password`, or `iam`; an unset mode preserves legacy password inference |
| `REDIS_USERNAME` / `REDIS_PASSWORD` | — | IAM requires a username equal to the ElastiCache user ID and forbids a static password; password mode requires the password |
| `REDIS_IAM_RESOURCE` | — | Lowercase provider-produced replication-group cache ID, not its DNS endpoint or ARN |
| `JWT_SECRET` | — | ≥ 32 chars (required in prod) |
| `ENCRYPTION_KEY` | — | 32-byte AES key (dev); KMS envelope in prod |
| `KMS_KEY_ID` / `KMS_MEDICAL_KEY_ID` | — | Separate keys per data classification |
| `S3_BUCKET` | — | Private, versioned, KMS-encrypted document bucket used for direct presigned upload/download |
| `CLOUDFRONT_DOMAIN` | — | Legacy document-CDN compatibility only; retain during stage one and never set to the frontend distribution |
| `KOISA_ENABLED` | `false` | Explicitly enable the guarded Bedrock Converse runtime |
| `BEDROCK_REGION` / `BEDROCK_MODEL_ID` | — | Required when enabled; region must equal `AWS_REGION` |
| `KOISA_MAX_ROUNDS` / `KOISA_MAX_TOTAL_TOOL_CALLS` / `KOISA_MAX_PER_TOOL_CALLS` | `4` / `6` / `2` | Bounded model/tool loop limits |
| `KOISA_OVERALL_TIMEOUT_MS` / `KOISA_TOOL_TIMEOUT_MS` | `15000` / `4000` | Bounded overall and per-tool deadlines |
| `KOISA_MAX_TOKENS` / `KOISA_MAX_TOOL_RESULT_BYTES` | `512` / `8192` | Bounded model output and projected tool-result sizes |
| `ENABLE_MEDICAL_MODULE` / `ENABLE_CLAIMS_MODULE` / `ENABLE_INTEGRATION_SIMULATION` | flags | |

### Redis authentication modes

Local no-auth Redis remains the default (`REDIS_AUTH_MODE=none`), and legacy deployments can
set `REDIS_AUTH_MODE=password` plus `REDIS_PASSWORD`. Production IAM mode requires Redis OSS 7+
and all of `REDIS_TLS=true`, `REDIS_AUTH_MODE=iam`, `REDIS_USERNAME`, `REDIS_IAM_RESOURCE`, and
`AWS_REGION`; `REDIS_PASSWORD` must be unset. The username must equal the ElastiCache user ID.

For IAM connections, `REDIS_HOST` remains the TLS/SNI network endpoint, while
`REDIS_IAM_RESOURCE` is the separate lowercase replication-group cache name/ID. The client signs
`GET /?Action=connect&User=<username>` for the `elasticache` service in `AWS_REGION`, with a
900-second SigV4 query expiry, and supplies the resulting URI without its scheme as the Redis
password. It resolves credentials through the AWS default provider chain and creates a new token
before every initial connection and automatic reconnect. Connections are rotated before the
12-hour IAM maximum without injecting `AUTH` into Bull subscription, blocking, transaction, or
Lua contexts; warm reminder Lambda invocations also check retained connection age after thaw.
Tokens are never logged.

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

Document delivery remains backend-authorized: the service signs version-aware S3 GET/PUT
requests for five minutes against `S3_BUCKET`; it does not construct frontend or CloudFront
URLs. During the two-stage frontend migration, stage one keeps the legacy document
`enable_cloudfront` resources and `CLOUDFRONT_DOMAIN` unchanged while the separate static
frontend bucket/distribution is introduced. The frontend production build must use an absolute
HTTPS `VITE_API_URL`, and its origin must be allowed by `CORS_ORIGIN`. Stage two may retire the
legacy document CDN only after direct presigned upload/download and every runtime consumer have
been verified. Never point `CLOUDFRONT_DOMAIN` at the frontend distribution. Frontend cache
headers and S3 artifact release are handled by `frontend/scripts/deploy-aws.sh`, separately from
Terraform; the backend must not receive frontend-bucket access.

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
  columns) is stripped from **every** tool result before it reaches the model. Authenticated
  tools assume the dedicated `rsf_koisa_reader` NOLOGIN role inside one transaction, set
  transaction-local user/tenant/client context plus a statement timeout, verify the active
  linkage, and pass that same transaction to every query. RLS policies then restrict the
  reader to the signed-in client. Raw tool payloads and model metadata are never serialized
  to the browser; the response controller permits only reply text and validated navigation
  actions.
- **User protection.** Each message is screened; if a user appears about to share sensitive
  information, Koisa returns a warning and does **not** process the message. Matched values
  are never logged or echoed. For supported requests, a local intent router sends Bedrock only
  a fixed, non-personal canonical instruction—the original browser text is never included in
  the model transcript. Authenticated model prose is validated but not sent to the browser;
  the server renders a neutral response from the approved tool/action that completed.

`services/koisa/guardrails.js` contains the enforced fallback policy and optionally merges an
`../agent/config/modes.json` policy when that separate agent package is present.

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

## Reminder delivery

`runDueReminders` treats `next_run_at` as the actual fire instant. `lead_days` remains policy
metadata until a separate due-date/anniversary field is introduced; it is not subtracted a
second time. Calendar anchors preserve month-end behavior. If execution was offline for several
cycles, one occurrence is materialized and the rule advances to the first future cycle, with the
skipped count reported.

Each audience occurrence is committed to PostgreSQL with the unique identity
`(reminder_rule_id, scheduled_for, audience)` before Bull enqueueing. Queue submission uses the
notification UUID as `jobId`; worker and Lambda reconciliation repair Redis outages from queued
rows. Tenant-wide rules must target `us`; `client` and `both` require a concrete client ID.
External delivery remains at-least-once and a real provider adapter must propagate the
notification UUID as its idempotency key.

---

## Testing

- `npm run check` — 28 offline require-graph/load checks.
- `npm test` — 47 offline unit and in-process HTTP checks covering RBAC, Koisa mode and
  response boundaries, encryption, financial math, onboarding ownership, and error shapes.
- The Koisa reader migration requires a PostgreSQL 16 staging migration/RLS isolation check
  before enabling Bedrock with authenticated production traffic.

---

## Docker & deployment

Multi-stage Dockerfile (non-root, healthcheck on `/health`). `docker-compose.yml` runs the
API with PostgreSQL 16 + Redis. See `scripts/deploy.sh` and `scripts/healthcheck.sh`.

## CI/CD

`.github/workflows/push-backend.yml` force-pushes `main` to the `backend` branch of the
system repo on every push. `GITHUB_TOKEN` is provided automatically.
