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

The dev server proxies `/api/*` to the backend (`VITE_API_PROXY`). Point `VITE_API_URL` at
the deployed API base for production builds.

## Backend endpoints used

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- `GET /clients`, `GET /financial/net-worth/:clientId`, `GET /policies/:clientId`,
  `GET /claims/:clientId`, `GET /documents/:clientId`
- `POST /medical` (KMS-encrypted questionnaire), `POST /documents/consent`
- `POST /workflow/approval/submit`, `GET /workflow/approval/pending`,
  `PUT /workflow/approval/:entityType/:entityId/approve|reject` (Adviser QA gate)
- `POST /koisa/chat` (public + authenticated modes)
