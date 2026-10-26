# 🤖 WhatsApp Automation Bot

<div align="center">

![WhatsApp Bot](https://img.shields.io/badge/WhatsApp-Automation-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Groq](https://img.shields.io/badge/AI-Groq%20LLM-orange?style=for-the-badge)](https://groq.com/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

**Enterprise-grade WhatsApp chatbot with AI, KYC, inventory management, and order processing.**

[Features](#-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [API](#-api-endpoints)

</div>

---

## 📖 Overview

A production-ready WhatsApp automation backend built with TypeScript and Express. This bot handles the complete customer lifecycle — from initial engagement and KYC verification to inventory browsing, order placement, and payment processing. It leverages Groq's LLM for intelligent conversation handling and features a Redis-backed message queue for reliable, rate-limited delivery.

---

## ✨ Features

### Core Automation
- 🧠 **AI-Powered Conversations** — Groq LLM integration for natural language understanding and buy intent detection
- 📋 **KYC Verification** — Full KYC flow with Aadhaar encryption, field validation, and document verification
- 🛒 **Order Management** — End-to-end order processing with status tracking and history
- 📦 **Inventory Management** — Real-time product catalog, virtual inventory, and stock tracking
- 💸 **Payment Integration** — Cashfree payment gateway integration
- 🔄 **Message Queue** — Redis-backed queue for reliable, rate-limited message delivery
- ⏰ **Expiry Management** — Automated handling of reservation expirations and timeouts
- 🎯 **Discount Engine** — Configurable discount rules and promotion handling
- 🕐 **Waitlist System** — Auto-managed waitlists with notifications when items become available

### Technical Features
- 🔒 **Security Hardened** — Helmet.js, rate limiting, CORS, input sanitization
- 📊 **Message Logging** — Persistent message audit trail in PostgreSQL
- 🏥 **Health Monitoring** — Cron-based health checks and uptime monitoring
- 🧪 **Test Suite** — Jest unit tests + Playwright E2E tests
- 🌐 **YCloud Integration** — WhatsApp Business API via YCloud provider

---

## 🏗️ Architecture

```
whatsapp-automation-bot/
├── src/
│   ├── server.ts              # Express app entry point
│   ├── app.ts                 # Middleware and route mounting
│   ├── routes/                # API route handlers (webhook, admin, orders)
│   ├── services/
│   │   ├── groq.ts            # LLM conversation engine
│   │   ├── kycHandler.ts      # KYC verification flow
│   │   ├── redis.ts           # Redis cache + session management
│   │   ├── inventory.ts       # Product catalog management
│   │   ├── orders.ts          # Order lifecycle management
│   │   ├── reservationV2.ts   # Reservation system with TTL
│   │   ├── messageQueue.ts    # Rate-limited message delivery
│   │   ├── discountHandler.ts # Promotion and discount rules
│   │   ├── waitlist.ts        # Waitlist with auto-notification
│   │   ├── buyIntentHandler.ts# Purchase intent detection
│   │   ├── expiryHandler.ts   # TTL and expiry management
│   │   ├── cashfree.ts        # Payment gateway integration
│   │   ├── ycloud.ts          # WhatsApp Business API client
│   │   ├── fieldValidator.ts  # Input validation and sanitization
│   │   ├── aadhaarCrypto.ts   # Aadhaar data encryption
│   │   ├── healthCron.ts      # System health monitoring
│   │   └── db.ts              # Database connection pool
│   ├── config/                # Environment configuration
│   └── db/                    # Database schema and migrations
├── tests/                     # Integration tests
└── playwright.config.ts       # E2E test configuration
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express 5 |
| AI/LLM | Groq SDK (Llama-3 / Mixtral) |
| Cache & Session | Redis (ioredis) |
| Database | PostgreSQL (pg) |
| Security | Helmet.js, express-rate-limit |
| Testing | Jest, Supertest, Playwright |
| Build | tsc (TypeScript compiler) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Redis server
- PostgreSQL database
- Groq API key ([get one free](https://console.groq.com))
- YCloud WhatsApp Business account

### Installation

```bash
git clone https://github.com/williamcsec/whatsapp-automation-bot.git
cd whatsapp-automation-bot
npm install
```

### Environment Variables

Create a `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@host/dbname

# Redis
REDIS_URL=redis://localhost:6379

# AI
GROQ_API_KEY=your_groq_api_key

# WhatsApp (YCloud)
YCLOUD_API_KEY=your_ycloud_api_key
YCLOUD_PHONE_NUMBER=+91XXXXXXXXXX

# Payments
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret

# Security
WEBHOOK_SECRET=your_webhook_verification_token
```

### Running

```bash
# Development (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/webhook` | Incoming WhatsApp message handler |
| `GET` | `/health` | System health check |
| `GET` | `/api/orders` | List all orders (admin) |
| `GET` | `/api/inventory` | Current product inventory |
| `POST` | `/api/send` | Manually send a WhatsApp message |

---

## 🔄 Message Flow

```
WhatsApp User
     ↓
YCloud Webhook → Express Router
     ↓
Groq LLM (intent detection)
     ↓
┌────────────────────────────────┐
│ KYC Handler │ Order Handler   │
│ Inventory   │ Discount Engine │
│ Reservation │ Waitlist        │
└────────────────────────────────┘
     ↓
Redis Message Queue (rate limited)
     ↓
YCloud API → WhatsApp User
```

---

## 📄 License

ISC © williamcsec
