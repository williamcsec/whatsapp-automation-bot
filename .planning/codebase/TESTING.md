# Testing

## Framework
- **Jest 30** with **ts-jest 29** transformer
- **Supertest 7** for HTTP endpoint testing
- Configuration in `package.json` (no separate `jest.config.ts`)

## Test Structure: Layered Architecture
Tests follow a layered pyramid approach. Each layer tests at a higher abstraction level:

| Layer | File | Focus | Dependencies |
|-------|------|-------|-------------|
| 1 | `layer1-unit.test.ts` (9.7KB) | Pure functions: validators, crypto, discount logic | None (mocked) |
| 2 | `layer2-db.test.ts` (13.7KB) | Database queries: products, orders, inventory | Postgres |
| 3 | `layer3-redis.test.ts` (9.3KB) | Redis operations: locks, sessions, dedup | Redis |
| 4 | `layer4-http.test.ts` (16.2KB) | HTTP endpoints: webhook handlers, health | Express + mocks |
| 5 | `layer5-kyc.test.ts` (21KB) | KYC state machine: field collection, validation, flow | All services |

## Current Test Status
- **layer1:** Likely passing (pure unit tests)
- **layer2:** Had stale assertions (`name` → `title`, `hash_id` → `id`). Fixed in Fix session.
- **layer3:** Needs verification (Redis connection required)
- **layer4:** Needs verification (webhook signature mocking)
- **layer5:** Needs verification (largest test file, complex state machine)

## Mocking Patterns
- External services (YCloud, Groq, Cashfree) mocked via `jest.mock()`
- Database and Redis tests use real connections (integration-style)
- No test database — tests run against actual Supabase instance

## Missing Test Coverage
- **No layer6:** End-to-end integration test (full message flow)
- **No dashboard tests:** Next.js pages/components have zero tests
- **No message bunching tests:** `messageQueue.ts` untested
- **No concurrency tests:** Race condition fixes not verified under load
- **No Playwright/E2E:** Browser-based testing not configured (though Playwright is available)

## Test Commands
```bash
npm test  # Currently just echoes "no test specified"
# Actual test run would be: npx jest --runInBand
```

## Issues
- `npm test` script is a no-op (`echo "Error: no test specified" && exit 1`)
- No CI/CD pipeline configured
- No test coverage reporting
