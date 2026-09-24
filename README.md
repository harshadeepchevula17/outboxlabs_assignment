# Production-Grade Email Scheduler Platform (OutboxLabs)

A production-quality distributed email scheduling platform built with **TypeScript**, **Node.js**, **Express**, **BullMQ**, **Redis**, **PostgreSQL (Prisma ORM)**, **Nodemailer (Ethereal SMTP)**, and **React (Vite, Tailwind CSS, TanStack Query)**.

---

## 🏗️ 1. Architecture Overview

```
                      +-----------------------------+
                      | React Dashboard (Vite)     |
                      +--------------+--------------+
                                     | REST API (Axios + TanStack Query)
                                     v
                      +-----------------------------+
                      | Express REST API (Node/TS)  |
                      +------+---------------+------+
                             |               |
              Zod Validation |               | Schedule Delayed Job
                             v               v
                   +------------------+  +--------------------+
                   | PostgreSQL DB    |  | Redis / BullMQ     |
                   | (Source of Truth)|  | (Delayed Jobs)     |
                   +--------+---------+  +---------+----------+
                            ^                      |
                            | DB State Updates     v Job Trigger
                            |            +--------------------+
                            +------------+ BullMQ Worker      |
                                         | Concurrency = 10   |
                                         +---------+----------+
                                                   |
                                 1. Idempotency    v 2. Distributed Throttling & Rate Limiter
                                         +--------------------+
                                         | Nodemailer SMTP    |
                                         | (Ethereal Email)   |
                                         +--------------------+
```

### Component Roles
1. **React Frontend**: Modern developer SaaS interface for scheduling emails, inspecting delivery details, managing sender accounts, tracking hourly rate limit usage, and viewing real-time telemetry.
2. **Express REST API**: Validates request payloads with **Zod**, manages authoritative database records, and enqueues delayed jobs into BullMQ.
3. **PostgreSQL + Prisma ORM**: Authoritative source of truth for email states, senders, attempts, delivery timestamps, failure diagnostics, and audit logs (`EmailEvent`).
4. **Redis**: Persistent data store for BullMQ queue structures, distributed rate limit counters (`email-rate:{senderId}:{YYYY-MM-DD-HH}`), and distributed minimum delay throttlers (`email-throttle:{senderId}`).
5. **BullMQ Queue & Worker**: Durable queue scheduler operating with configurable concurrency (`WORKER_CONCURRENCY=10`). Handles delayed job execution, retries with exponential backoff, rate-limit deferral, and atomic state transitions.
6. **Nodemailer + Ethereal SMTP**: Outbound email transport with support for multiple senders and Ethereal web inbox preview links.

---

## ⚡ 2. Why BullMQ (No Cron / No setInterval)

This application strictly uses **BullMQ delayed jobs backed by Redis** for all scheduling.
- **Why not `node-cron` or `setInterval`?** In-memory cron timers lost state when a process restarts, fail in multi-instance horizontally scaled environments (leading to duplicate runs), and struggle with precise high-frequency precision.
- **Why BullMQ delayed jobs?** BullMQ leverages Redis `zset` (sorted sets) where the score represents the target execution timestamp (`scheduledAt`). Redis manages timer triggers natively in memory with persistent disk snapshots (`AOF/RDB`). Multiple worker processes running across separate servers pull jobs from Redis safely using atomic ZPOP operations without race conditions.

---

## 🔄 3. Server Restart & Crash Recovery

- Delayed jobs reside durably inside Redis. When the Express API or BullMQ Worker crashes or restarts, **zero scheduled jobs are lost**.
- On startup, the backend does **NOT** scan PostgreSQL or run startup cron reconciliation loops. BullMQ automatically resumes monitoring pending delayed jobs upon connection.
- If Redis restarts, its volume mapping (`redis_data`) and `--appendonly yes` configuration ensure all delayed job states survive container rebuilds.

---

## 🔒 4. Idempotency (Preventing Duplicate Sends)

Guaranteeing that an email is **NEVER sent twice**—even across worker restarts, network retries, or concurrent duplicate triggers—is implemented via an **atomic database conditional state machine**:

```typescript
const count = await prisma.email.updateMany({
  where: {
    id: emailId,
    status: EmailStatus.SCHEDULED,
  },
  data: {
    status: EmailStatus.PROCESSING,
  },
});
```

### Execution Flow:
1. When the BullMQ worker picks up a job `{ emailId }`, it reads the authoritative record from PostgreSQL.
2. If `status === 'SENT'` or `status === 'CANCELLED'`, the worker returns immediately.
3. The worker executes an atomic `UPDATE` query transitioning `SCHEDULED` → `PROCESSING` where `status = 'SCHEDULED'`.
4. If `count === 0`, another worker claimed or completed the job. The worker aborts execution immediately.

---

## 🛑 5. Distributed Throttling & Hourly Rate Limiting

### Minimum Delay (`MIN_DELAY_BETWEEN_EMAILS_MS`, Default: `2000ms`)
- Multiple workers running concurrently must not fire emails faster than the minimum delay per sender.
- **Implementation**: Uses a Redis-backed atomic slot reservation script:
  `nextAllowedTime = max(now, lastReservedTime + MIN_DELAY_MS)`
  If `nextAllowedTime > now`, the worker delays sending by `nextAllowedTime - now` before invoking Nodemailer.

### Hourly Rate Limiting (`MAX_EMAILS_PER_HOUR_PER_SENDER`, Default: `200`)
- Configured via environment variables (`MAX_EMAILS_PER_HOUR_PER_SENDER=200`).
- **Implementation**: Redis key format `email-rate:{senderId}:{YYYY-MM-DD-HH}` incremented via an atomic Redis Lua script.
- **Rescheduling Behavior (Zero Job Loss)**:
  If a sender exceeds `200` emails in the current hour window:
  1. The email is **NOT** marked as failed.
  2. The start of the next hourly window (e.g. `19:00:00.000`) is calculated.
  3. The database record is reverted to `SCHEDULED` with `scheduledAt = nextHourStart`.
  4. `RATE_LIMITED` and `RESCHEDULED` audit events are logged in `EmailEvent`.
  5. The BullMQ delayed job is rescheduled for the new timestamp.

---

## 🚀 6. 1000+ Email High-Load Scale Behavior

When 1,000+ emails are scheduled for the exact same second:
1. **BullMQ Queue Absorption**: BullMQ stores all 1,000 jobs inside Redis sorted sets without blocking Node event loops.
2. **Worker Concurrency Control**: Workers pull up to `WORKER_CONCURRENCY` (e.g. `10`) jobs simultaneously.
3. **Throttling & Pacing**: Distributed throttling paces dispatches at 2-second intervals per sender.
4. **Rate Limit Window Overflow**: The first 200 emails dispatch during the current hour window; emails #201–400 automatically shift to Hour +1; emails #401–600 shift to Hour +2, preserving FIFO order without dropping any jobs.

---

## 🛠️ 7. Setup & Local Development Commands

### Prerequisites
- **Node.js**: v18+
- **Docker & Docker Compose** (or local PostgreSQL & Redis)

### Quick Start
```bash
# 1. Clone the repository
git clone https://github.com/your-org/outboxlabs.git
cd OutboxLabs

# 2. Start PostgreSQL and Redis via Docker Compose
docker compose up -d

# 3. Install dependencies for backend & frontend
npm install
npm --prefix backend install
npm --prefix frontend install

# 4. Copy environment configuration
cp .env.example backend/.env

# 5. Run Prisma Database Migrations
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..

# 6. Start Development Servers (Backend, Worker, Frontend)
# Terminal 1: API & Embedded Worker
npm run dev:backend

# Terminal 2: React Frontend Dashboard (http://localhost:3000)
npm run dev:frontend
```

---

## 🧪 8. Automated Testing

Run unit and integration tests using Vitest:
```bash
npm run test
```

Tests cover:
- Zod schema validation (email addresses, ISO date strings, subject limits).
- Rate limiter hourly window calculator and key generation logic.
- Atomic state transitions and idempotency checks.

---

## 🌐 9. REST API Documentation

### Emails
- **`POST /api/emails`**: Schedule a new email payload.
  ```json
  {
    "senderId": "uuid-v4",
    "toEmail": "user@example.com",
    "subject": "System Report",
    "body": "Weekly summary text...",
    "scheduledAt": "2026-09-23T18:30:00.000Z"
  }
  ```
- **`GET /api/emails`**: List emails with pagination (`page`, `limit`), `status`, `search`, `senderId`.
- **`GET /api/emails/scheduled`**: Filtered list of pending scheduled emails.
- **`GET /api/emails/sent`**: Filtered list of delivered emails with Ethereal preview links.
- **`GET /api/emails/failed`**: Filtered list of failed email attempts.
- **`GET /api/emails/:id`**: Complete email details, sender info, error logs, and audit trail events.
- **`DELETE /api/emails/:id`**: Safely cancels a scheduled job, removing it from BullMQ and updating status to `CANCELLED`.

### Senders
- **`POST /api/senders`**: Add custom SMTP sender configuration.
- **`POST /api/senders/auto-generate`**: 1-click generation of an Ethereal test sender with web inbox access.
- **`GET /api/senders`**: List all senders along with real-time hourly rate limit status.
- **`GET /api/senders/:id`**: Get single sender detail.
- **`DELETE /api/senders/:id`**: Delete sender account.
- **`GET /api/senders/:id/rate-limit`**: Fetch sender rate limit telemetry.

### Dashboard
- **`GET /api/dashboard/stats`**: Aggregated counter metrics, recent system events stream, and queue status totals.

---

## ⚙️ 10. Environment Variables

| Variable | Default Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgrespassword@localhost:5432/outboxlabs` | PostgreSQL connection string |
| `REDIS_HOST` | `127.0.0.1` | Redis host address |
| `REDIS_PORT` | `6379` | Redis port |
| `PORT` | `4000` | Express API server port |
| `WORKER_CONCURRENCY` | `10` | Worker concurrency thread count |
| `MIN_DELAY_BETWEEN_EMAILS_MS` | `2000` | Minimum throttle delay between sends (ms) |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `200` | Maximum hourly rate limit per sender |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin for frontend |

---

## ⚖️ 11. Architectural Trade-offs & Engineering Decisions

1. **DB as Authoritative Source vs Redis Payload**: BullMQ jobs store only `{ emailId }`. The worker queries PostgreSQL for the subject, body, and credentials. This increases DB reads slightly per job but guarantees single-source-of-truth consistency and prevents stale data in Redis.
2. **Rescheduling Over Rejection**: When rate limits are reached, excess jobs are deferred to the next hourly window instead of returning `429 Too Many Requests` or failing jobs. This ensures reliability for marketing & notification campaigns.
3. **Atomic SQL Updates for Idempotency**: Using `updateMany` with status conditions in SQL avoids memory lock overhead and supports scaling to multi-node worker clusters safely.
