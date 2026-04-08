# Project Structure

## Root Layout
```
whatsaap automation bot/
├── src/                    # Backend (Express + TypeScript)
│   ├── app.ts              # Express app setup
│   ├── server.ts           # Server entry point + crons
│   ├── config/
│   │   └── env.ts          # Environment variable config
│   ├── routes/
│   │   └── webhook.ts      # All webhook handlers (505 lines)
│   ├── services/           # 22 service modules
│   │   ├── db.ts           # Postgres pool
│   │   ├── redis.ts        # Redis client (333 lines)
│   │   ├── groq.ts         # AI service (115 lines)
│   │   ├── ycloud.ts       # WhatsApp API
│   │   ├── cashfree.ts     # Payment gateway
│   │   ├── messageQueue.ts # Abort & Group dedup
│   │   ├── kycHandler.ts   # KYC state machine (19KB)
│   │   ├── reservationV2.ts# Tiered reservations (11KB)
│   │   ├── inventory.ts    # Product allocation
│   │   ├── waitlist.ts     # Waitlist queue
│   │   └── ...             # 12 more services
│   ├── db/                 # SQL migration files
│   │   ├── 003_dashboard.sql
│   │   ├── 004_customers_chats.sql
│   │   └── 005_invoices.sql
│   └── __tests__/          # 5 test layers
│       ├── layer1-unit.test.ts
│       ├── layer2-db.test.ts
│       ├── layer3-redis.test.ts
│       ├── layer4-http.test.ts
│       └── layer5-kyc.test.ts
├── dashboard/              # Frontend (Next.js 16)
│   ├── src/app/
│   │   ├── login/page.tsx  # Login (no auth)
│   │   ├── (dashboard)/    # Protected routes (not actually protected)
│   │   │   ├── layout.tsx  # Sidebar + Header
│   │   │   ├── dashboard/page.tsx    # KPIs (mock data)
│   │   │   ├── customers/page.tsx    # Customer list (live)
│   │   │   ├── orders/page.tsx       # Order management (live)
│   │   │   ├── products/page.tsx     # Product catalog (live)
│   │   │   ├── analytics/page.tsx
│   │   │   ├── billing/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/messages/send/route.ts # Manual message API
│   ├── src/components/dashboard/     # Sidebar, Header
│   ├── src/lib/            # Supabase clients, utils
│   └── src/types/          # TypeScript interfaces
├── .agent/                 # GSD workflow system
├── .agents/skills/         # AI skills (shadcn, code-review, etc.)
├── .planning/              # GSD planning documents
├── .env                    # Environment variables
├── package.json            # Backend dependencies
├── tsconfig.json           # TypeScript config
└── nodemon.json            # Dev watcher config
```

## Key Locations
| Need | Location |
|------|----------|
| Add a new service | `src/services/{name}.ts` |
| Add webhook handler | `src/routes/webhook.ts` (append to existing) |
| Add dashboard page | `dashboard/src/app/(dashboard)/{name}/page.tsx` |
| Add dashboard API | `dashboard/src/app/api/{name}/route.ts` |
| Add SQL migration | `src/db/00N_{name}.sql` |
| Add test layer | `src/__tests__/layerN-{name}.test.ts` |
| Environment vars | `src/config/env.ts` + `.env` |

## Naming Conventions
- **Services:** camelCase files, exported functions (e.g., `buyIntentHandler.ts` → `buyIntentHandler()`)
- **Routes:** kebab-case URL paths (e.g., `/whatsapp-incoming`)
- **Tests:** `layerN-{focus}.test.ts` pattern
- **Dashboard pages:** directory-based routing (Next.js App Router)
- **Redis keys:** colon-separated namespaces (e.g., `reserve:item:{id}:lock`)
