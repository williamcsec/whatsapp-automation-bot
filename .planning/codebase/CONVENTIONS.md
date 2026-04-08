# Code Conventions

## TypeScript Style
- **Strict mode** enabled in `tsconfig.json`
- Explicit return types on exported functions
- `interface` preferred over `type` for object shapes
- `@ts-ignore` used sparingly (2 occurrences in `webhook.ts` for Express raw body typing)

## Error Handling Pattern
- **Services:** Throw on critical failures, return null/error objects for expected states
- **Webhook:** Global try/catch always returns HTTP 200 (FIX 1 — prevents YCloud retry cascades)
- **Redis:** All Redis operations wrapped in try/catch with fallback to Postgres
  - Pattern: `try { redis.op() } catch { /* Redis unavailable — allow through */ }`
- **DB:** Query wrapper logs all queries with duration (`src/services/db.ts`)

## Logging Convention
- **Console prefixes:** `[BOOT]`, `[REDIS]`, `[DB]`, `[YCLOUD_HOOK]`, `[GROQ]`, `[HEALTH_CRON]`, `[EXPIRY_CRON]`, `[WAITLIST]`
- **Format:** `console.log('[PREFIX] Message', data)`
- No structured logging library (plain console.log/error/warn)
- DB queries log text + duration in ms

## State Machine Pattern (KYC)
- `kycHandler.ts` uses Redis-backed state machine
- States managed via `getKYCState()` / `setKYCState()`
- Fields collected iteratively: name → phone → aadhaar → address → city → pincode
- Each field has dedicated validation in `fieldValidator.ts`
- Confirmation step with edit capability before finalizing

## Reservation System Pattern
- **Three-tier:** Soft Reserve → Hard Reserve → Payment Pending → Completed
- Each tier has TTL-based expiry handled by `expiryHandler.ts`
- State transitions logged to `reservation_audit` table
- `logAudit()` provides full audit trail with from/to states

## Configuration Pattern
- **Single file:** `src/config/env.ts` exports `ENV` object
- **dotenv:** Loaded at import time via `dotenv.config()`
- **Validation:** `validateEnv()` warns on missing keys but doesn't crash
- **Dashboard:** Uses `process.env` directly in Next.js route handlers

## Import Organization
- External packages first
- Internal config/utils second
- Service imports third (grouped by phase)
- Comments mark which phase introduced each import
