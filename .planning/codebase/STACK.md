# Technology Stack

## Languages & Runtime
- **TypeScript** (strict mode) — Both backend and dashboard
- **Node.js** — Backend runtime via `ts-node` (dev) / `tsc` → `node dist/` (prod)
- **React 19** — Dashboard frontend (Next.js)

## Backend Framework
- **Express 5.2** — HTTP framework (`src/app.ts`)
  - Raw body preservation for HMAC webhook verification
  - Single router: `webhookRouter` mounted at `/webhook`
  - Health check at `GET /health`
- **Nodemon 3.1** — Dev hot-reload via `npm run dev`

## Frontend Framework
- **Next.js 16.1** — Dashboard app (`dashboard/`)
  - App Router with `(dashboard)` route group
  - Server Components for data fetching pages
  - Client Components for interactive UI

## UI Libraries (Dashboard)
- **Tailwind CSS 4** — Styling (via `@tailwindcss/postcss`)
- **shadcn/ui 3.8** — Component system (devDependency, partially set up)
- **Radix UI 1.4** — Accessible primitives
- **Lucide React** — Icons
- **Recharts 3.7** — Charts/graphs
- **React Hook Form 7 + Zod 4** — Form validation
- **@tanstack/react-table 8** — Data tables
- **Sonner 2** — Toast notifications
- **Zustand 5** — Client state management
- **class-variance-authority** + **clsx** + **tailwind-merge** — Style utilities

## Database
- **PostgreSQL** (Supabase hosted) — via `pg` driver (`src/services/db.ts`)
  - Connection pooling with query logging
  - Transaction support via `db.transaction()`
  - Tables: products, pending_orders, completed_orders, conversations, customers, waitlists, reservation_audit, system_health, ai_interactions

## Cache / Queue
- **Redis** (via `ioredis`) — `src/services/redis.ts`
  - Distributed locking (reservation locks)
  - Session state management
  - Message deduplication (NX gates)
  - Rate limiting (INCR + EXPIRE)
  - Sorted set waitlists (ZADD/ZPOPMIN)
  - Error-resilient with lazy reconnect

## AI
- **Groq SDK** — LLM inference (`src/services/groq.ts`)
  - Model: `llama-3.1-70b-versatile`
  - Function calling (tool: `fetch_chat_history`)
  - 8-second timeout with AbortController
  - Max 800 tokens per response

## Build & Dev Tools
- **TypeScript 5.9** — Strict compilation
- **ts-node 10.9** — Dev runtime
- **nodemon 3.1** — File watching
- **Jest 30 + ts-jest 29** — Testing framework
- **Supertest 7** — HTTP testing
- **ESLint 9** — Linting (dashboard)

## Package Configuration
- **Backend:** `"type": "commonjs"` in package.json
- **Dashboard:** Next.js with ESM internally
- **Monorepo:** Separate `package.json` files for backend and dashboard (not a workspace)
