# Royal Square Financial — Frontend

React + TypeScript single-page app for the Royal Square Financial platform, wired to the
v2.0.0 Express/Sequelize backend. Styling is deliberately **minimal: cream white, with a bit
of black and maroon** — a restrained "war-room presentation" aesthetic.

## Stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** with a small design-token theme (`cream` / `ink` / `maroon`)
- **TanStack Query** for server state
- **React Hook Form + Zod** for forms and validation
- **Axios** client with Bearer + refresh-token interceptors
- **React Router** for routing, **Recharts** for dashboard charts

## Design tokens

| Token | Hex | Use |
|---|---|---|
| `cream` | `#FAF7F2` | Page background |
| `cream-200` | `#F3EDE3` | Panels / cards |
| `cream-300` | `#E8DFD1` | Borders / dividers |
| `ink` | `#1A1613` | Primary text (near-black) |
| `maroon` | `#6E1423` | Primary accent |
| `maroon-tint` | `#F4E4E6` | Subtle accent wash |

## Structure

```
src/
├── api/          # Axios client + endpoint modules (auth, staging, medical, koisa, …)
├── components/
│   ├── ui/       # Shared primitives (Button, Input, Card, Badge, Tabs, Modal, …)
│   ├── onboarding/  # Multi-step onboarding + 18-point medical intake
│   ├── admin/    # Adviser Staging Studio (split-screen QA gate)
│   └── ai/       # Koisa floating chat drawer + action handler
├── hooks/        # useAuth, useKoisaActions
├── schemas/      # Zod schemas mirroring backend models
├── pages/        # Landing, Login, Dashboard, Admin, Onboarding
└── lib/          # helpers (cn, formatting)
```

## Getting started

```bash
cp .env.example .env
npm install
npm run dev            # http://localhost:5173  (proxies /api → http://localhost:3000)
npm run build          # type-check + production build
```

The dev server proxies `/api/*` to the backend (`VITE_API_PROXY`). Production static delivery
has no proxy behavior, so production builds **must** use an absolute HTTPS API base, for example
`VITE_API_URL=https://api.example.com/api/v1`. The backend `CORS_ORIGIN`/Terraform
`cors_origin` must independently allow the deployed frontend origin.

## AWS static deployment

Infrastructure is a two-stage migration. During **stage one**, keep the legacy document
`enable_cloudfront = true` and separately set `enable_frontend_delivery = true`; do not retire or
repurpose the document bucket/CDN. Only after a strict no-destroy plan and a separately authorized
infrastructure deployment should frontend artifacts be uploaded. **Stage two** (later) may disable
the legacy flag only after presigned document delivery and all runtime consumers have been proven
independent of it. See `infra/README.md` for the plan checks and rollback gates.

The standalone helper defaults to `DRY_RUN=true`, verifies the AWS account and that the
selected distribution has an OAC origin for the selected bucket, requires an absolute production
`VITE_API_URL`, then always produces a fresh build. Hashed
`dist/assets/*` files are uploaded first with a one-year immutable cache header; mutable entry
files such as `index.html` are uploaded separately with `no-cache,no-store,must-revalidate`.
Old hashed assets are deliberately retained for rollback. A live deployment requires a second,
bucket-specific confirmation and invalidates only `/` and `/index.html`:

```bash
export EXPECTED_AWS_ACCOUNT_ID=123456789012
export FRONTEND_BUCKET="$(terraform -chdir=../infra output -raw frontend_bucket)"
export CLOUDFRONT_DISTRIBUTION_ID="$(terraform -chdir=../infra output -raw frontend_cloudfront_distribution_id)"
export VITE_API_URL="https://api.example.com/api/v1"

npm run deploy:aws                         # safe preview; uploads nothing
DRY_RUN=false \
CONFIRM_FRONTEND_DEPLOY="$FRONTEND_BUCKET:$CLOUDFRONT_DISTRIBUTION_ID" \
npm run deploy:aws                         # explicit live artifact release
```

The helper uses the caller's existing AWS credential chain; do not add credentials to this
repository. Infrastructure and artifact release remain separate: Terraform never manages S3
objects, and this script never creates or changes infrastructure. Prune retained hashed assets
only in a separately reviewed retention process, never in the entry-point deployment.

## Backend endpoints used

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- `GET /clients`, `GET /financial/net-worth/:clientId`, `GET /policies/:clientId`,
  `GET /claims/:clientId`, `GET /documents/:clientId`
- `POST /medical` (KMS-encrypted questionnaire), `POST /documents/consent`
- `POST /workflow/approval/submit`, `GET /workflow/approval/pending`,
  `PUT /workflow/approval/:entityType/:entityId/approve|reject` (Adviser QA gate)
- `POST /koisa/chat` (public + authenticated modes)
