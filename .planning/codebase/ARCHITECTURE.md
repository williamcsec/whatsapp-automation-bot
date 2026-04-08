# Architecture

## Pattern: Event-Driven Service Layer
The system follows an event-driven architecture where YCloud webhook events trigger a pipeline of service calls. There is no traditional REST API — the backend exists purely to process webhook events and respond via WhatsApp API.

## Layers

### Layer 1: HTTP Entry (Express)
- `src/app.ts` — Express setup, CORS, raw body preservation, health endpoint
- `src/server.ts` — Server bootstrap, cron initialization, graceful shutdown
- `src/routes/webhook.ts` — Single 505-line route file handling all webhook logic

### Layer 2: Service Layer (Business Logic)
- `src/services/groq.ts` — AI intent detection with function calling
- `src/services/messageQueue.ts` — Abort & Group message bunching
- `src/services/buyIntentHandler.ts` — Purchase intent → reservation flow
- `src/services/kycHandler.ts` — KYC state machine (19KB, largest service)
- `src/services/discountHandler.ts` — Discount code application
- `src/services/softBrowseHandler.ts` — Soft nudge for browsers
- `src/services/reservationV2.ts` — Tiered reservation system (soft → hard → payment)
- `src/services/inventory.ts` — Product allocation with row locking
- `src/services/waitlist.ts` — Waitlist queue (Redis sorted sets + Postgres)
- `src/services/virtualInventory.ts` — Virtual item sourcing flow

### Layer 3: Data Access
- `src/services/db.ts` — Postgres connection pool, query wrapper with logging, transactions
- `src/services/redis.ts` — Redis client with session management, locking, rate limiting
- `src/services/products.ts` — Product CRUD operations
- `src/services/orders.ts` — Order lifecycle management
- `src/services/messageLogger.ts` — Conversation logging (inbound/outbound)

### Layer 4: External APIs
- `src/services/ycloud.ts` — WhatsApp message sending/receiving
- `src/services/cashfree.ts` — Payment link generation/verification

### Layer 5: Security
- `src/services/aadhaarCrypto.ts` — AES-256-GCM encryption for Aadhaar numbers
- `src/services/fieldValidator.ts` — Input validation for KYC fields

### Layer 6: Operations
- `src/services/expiryHandler.ts` — Reservation expiry cron (60s interval)
- `src/services/healthCron.ts` — System health checks (5m interval)
- `src/config/env.ts` — Environment variable loading and validation

## Data Flow: Inbound Message
```
YCloud Webhook → Express → Signature Verify → Dedup (Redis NX)
  → Extract Payload → Store Conversation → Check Session State
  → Route by message type:
    - Text → Message Queue → Groq AI (intent detection) → Action Handler
    - Button Reply → Direct Action Handler
  → Action Handlers:
    - browse_products → Show inventory with buttons
    - reserve_physical → Start KYC → Reservation → Payment Link
    - price_objection → Discount handler
    - waitlist → Add to queue
    - virtual_interest → Virtual inventory gate
```

## Data Flow: Payment Completion
```
Cashfree Webhook → Signature Verify → Find Order → Mark Paid
  → Update Product Status → Clear Reservation → Notify Customer
  → Release waitlist next person (if any)
```

## Dashboard (Separate App)
- **Next.js App Router** at `dashboard/`
- Server Components fetch from Supabase directly
- 7 pages: Dashboard, Customers, Orders, Products, Analytics, Billing, Settings
- 1 API route: `/api/messages/send` — manual WhatsApp message sending
- **No authentication currently** — login page is cosmetic

## Entry Points
- `src/server.ts` — Backend entry
- `dashboard/src/app/layout.tsx` — Dashboard entry
- `POST /webhook/whatsapp-incoming` — Primary business logic trigger
- `POST /webhook/cashfree-webhook` — Payment confirmation trigger
