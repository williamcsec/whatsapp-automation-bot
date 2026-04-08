# Concerns & Technical Debt

## 🔴 Critical Security Issues

### 1. No Dashboard Authentication
- **File:** `dashboard/src/app/login/page.tsx` (line 15)
- **Issue:** Login form does `router.push('/dashboard')` on submit — no password check, no token, nothing
- **Impact:** Anyone can access the entire admin panel
- **Fix:** Wire Supabase Auth, add Next.js middleware for route protection

### 2. CORS Wide Open
- **File:** `src/app.ts` (line 7)
- **Issue:** `app.use(cors())` with no origin restrictions
- **Impact:** Any website can make API calls to the backend
- **Fix:** Configure allowed origins (`dashboard URL`, `ycloud domains`)

### 3. `/api/messages/send` Has No Auth
- **File:** `dashboard/src/app/api/messages/send/route.ts`
- **Issue:** POST endpoint sends WhatsApp messages with zero authentication
- **Impact:** Anyone who discovers the URL can spam WhatsApp messages
- **Fix:** Require valid Supabase session token in request

### 4. `aadhaarCrypto.ts` Crashes Server on Boot
- **File:** `src/services/aadhaarCrypto.ts` (lines 17-20)
- **Issue:** `throw new Error(...)` at module level if `AADHAAR_ENCRYPTION_KEY` is missing
- **Impact:** Server completely fails to start if KYC isn't configured
- **Fix:** Lazy-initialize key on first use, not at import time

## 🟠 Architecture Concerns

### 5. Monolithic Webhook Handler
- **File:** `src/routes/webhook.ts` — 505 lines, single function
- **Issue:** All business logic (AI, reservations, KYC, discounts, payments) lives in one handler
- **Impact:** Hard to test, hard to modify, easy to break unrelated flows
- **Recommendation:** Extract action-specific handlers into separate route files

### 6. No Structured Logging
- **Issue:** All logging via `console.log/error/warn` with string prefixes
- **Impact:** Cannot aggregate logs, search by severity, or set up production alerting
- **Recommendation:** Consider Pino or Winston for JSON structured logging

### 7. No Request Tracing
- **Issue:** No request IDs or correlation IDs across service calls
- **Impact:** Cannot trace a single user message through the entire pipeline
- **Recommendation:** Generate UUID per webhook and pass through all service calls

## 🟡 Testing Gaps

### 8. Test Script Is a No-Op
- **File:** `package.json` script `"test": "echo \"Error: no test specified\" && exit 1"`
- **Impact:** `npm test` does nothing. Tests exist but aren't wired up.
- **Fix:** Change to `"test": "jest --runInBand"`

### 9. No Dashboard Tests
- **Issue:** Zero tests for the Next.js dashboard (7 pages, API routes)
- **Impact:** Any dashboard change could silently break

### 10. No E2E Tests
- **Issue:** Playwright is available but not configured
- **Impact:** Can't verify full user flows (login → dashboard → manage orders)

## 🟡 Performance Concerns

### 11. Dashboard Uses Mock Data
- **File:** `dashboard/src/app/(dashboard)/dashboard/page.tsx`
- **Issue:** Revenue, orders, reservations are all hardcoded values
- **Impact:** Dashboard is visual-only — provides no operational value

### 12. No Index Optimization
- **Issue:** Unknown if Postgres indexes are optimized for common query patterns
- **Examples:** `products WHERE status = 'available'`, `conversations WHERE customer_phone = $1`
- **Recommendation:** Audit with `EXPLAIN ANALYZE` on critical queries

## 🟢 Recently Fixed (Fixes 1-12)
- ✅ Redis dedup gate (Fix 1)
- ✅ Message bunching (Fix 2)
- ✅ Atomic Redis locks (Fix 3)
- ✅ Row-level DB locking (Fix 4)
- ✅ Transaction wrapping (Fix 5)
- ✅ Groq timeout (Fix 6)
- ✅ Redis SCAN (Fix 7)
- ✅ AI response limits (Fix 8)
- ✅ Aadhaar env validation (Fix 9)
- ✅ Timestamp parsing (Fix 10)
- ✅ SIGINT shutdown (Fix 11)
- ✅ Waitlist iteration (Fix 12)
