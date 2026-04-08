# External Integrations

## YCloud — WhatsApp Business API
- **Purpose:** Send/receive WhatsApp messages
- **Files:** `src/services/ycloud.ts`
- **Auth:** API key via `X-API-Key` header (`ENV.YCLOUD_API_KEY`)
- **Webhook:** `POST /webhook/whatsapp-incoming` — receives inbound messages and status updates
- **Signature verification:** HMAC-SHA256 via `Ycloud-Signature` header (`ENV.YCLOUD_WEBHOOK_SECRET`)
- **Capabilities:**
  - `sendWhatsAppMessage()` — text messages
  - `sendWhatsAppImage()` — image messages
  - `sendWhatsAppInteractiveButtons()` — button reply messages
  - `extractYCloudWebhook()` — parse inbound webhook payloads
- **Event types handled:**
  - `whatsapp.inbound_message.received` — user messages (text, interactive button_reply)
  - `whatsapp.message.updated` — delivery status updates (ignored)

## Groq — AI/LLM Service
- **Purpose:** Intent detection, conversational AI
- **Files:** `src/services/groq.ts`
- **Auth:** API key (`ENV.GROQ_API_KEY`)
- **Model:** `llama-3.1-70b-versatile`
- **Features:**
  - Function calling with `fetch_chat_history` tool
  - AbortSignal support for cancellation
  - 8-second hard timeout
  - JSON response parsing with graceful fallback
- **Response format:** JSON with `action`, `response_text`, optional `product_id`/`hash_id`

## Cashfree — Payment Gateway
- **Purpose:** Generate payment links for reservations
- **Files:** `src/services/cashfree.ts`
- **Auth:** App ID + Secret Key (`ENV.CASHFREE_APP_ID`, `ENV.CASHFREE_SECRET_KEY`)
- **Environment:** Sandbox / Production toggle
- **Webhook:** `POST /webhook/cashfree-webhook` — payment status updates
- **Signature verification:** `verifyCashfreeSignature()`
- **Flow:** Create payment link → user pays → webhook confirms → mark order paid

## Supabase — Database & Auth
- **Purpose:** PostgreSQL hosting, dashboard auth (planned)
- **Backend files:** `src/services/db.ts` — raw `pg` pool (NOT Supabase JS client)
- **Dashboard files:** `dashboard/src/lib/supabase.ts`, `supabase-server.ts` — Supabase JS client
- **Auth:** Service key for server-side (`SUPABASE_SERVICE_KEY`), planned client auth for dashboard
- **Tables used:** products, pending_orders, completed_orders, conversations, customers, waitlists, reservation_audit, system_health, ai_interactions, discount_codes

## Redis (Upstash/Self-hosted)
- **Purpose:** Distributed caching, locking, queuing
- **Files:** `src/services/redis.ts`
- **Auth:** Connection URL (`ENV.REDIS_URL`)
- **Key patterns:**
  - `dedup:msg:{ycloud_message_id}` — webhook deduplication (5 min TTL)
  - `reserve:item:{productId}:*` — reservation locks
  - `session:{phone}:state` — conversation state
  - `session:{phone}:lastInteraction` — activity tracking
  - `ratelimit:{phone}` — per-phone rate limiting
  - `kyc:{phone}:*` — KYC flow state
  - `virtual:confirm:{productId}:{phone}` — virtual item gates

## ngrok — Webhook Tunnel (Dev)
- **Purpose:** Expose local server to YCloud/Cashfree webhooks during development
- **Usage:** `ngrok http 5678` — creates public HTTPS URL forwarding to local port 5678
