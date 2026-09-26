# PRD: EchoGPT Backend REST API

**NestJS · PostgreSQL · Prisma · Swagger (OpenAPI) · JWT**

Version 1.0 · Prepared for: AppifyDevs Backend Internship Assignment
Reference: EchoGPT Chrome Extension (multi-AI chat + web search)

---

## 1. Overview

EchoGPT's backend is the API layer behind a Chrome extension that lets a user chat with multiple AI providers (OpenAI, Anthropic, Gemini), search the web with AI assistance, and manage a subscription that gates usage. This document breaks the assignment into implementable modules, each with endpoints, request/response shapes, edge cases, and the DB tables that back it, followed by the full schema, folder structure, and a suggested build order.

**Guiding principles**
- Clean/modular architecture: one NestJS module per domain, each with `controller / service / dto / entity(or prisma model)`.
- Stateless auth via short-lived JWT access tokens + rotating refresh tokens stored hashed in DB.
- No plaintext secrets anywhere: passwords bcrypt/argon2 hashed, provider API keys encrypted at rest (AES-256-GCM) with a server-side master key (env var / KMS).
- Every endpoint documented in Swagger with `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`, DTO-driven request/response schemas.
- All list endpoints are paginated, filterable, and sortable by default — never return unbounded result sets.
- Centralized `HttpExceptionFilter` + a consistent error envelope (section 10).
- Rate limiting (per-user + per-IP) via `@nestjs/throttler`, tuned per subscription tier for the AI/search endpoints specifically.

---

## 2. Tech Stack & Justification

| Concern | Choice | Why |
|---|---|---|
| Framework | NestJS (TypeScript) | DI, module boundaries, decorators map cleanly to Swagger + guards |
| DB | PostgreSQL | Relational integrity for users/subscriptions/usage, JSONB for flexible provider configs & chat metadata |
| ORM | Prisma | Type-safe client, first-class migrations, good DX for this scope (TypeORM is an acceptable substitute — see note in §12) |
| Auth | Passport JWT strategy + custom Refresh strategy | Industry standard, easy to extend to OAuth later |
| Docs | `@nestjs/swagger` | Auto-generates OpenAPI from decorators/DTOs |
| Caching | Redis (ioredis) | Search-result caching, refresh-token blacklist, rate-limit store |
| Queue (bonus) | BullMQ + Redis | Streaming/long-running AI calls, usage-log write-behind |
| Container | Docker + docker-compose (api, postgres, redis, pgadmin) | Reproducible local/dev/staging envs |

---

## 3. Module-by-Module Implementation Plan

Each module lists: purpose, endpoints (method, path, auth, roles), key DTO fields, and edge cases to handle explicitly.

### 3.1 Auth Module (`/auth`)

**Purpose:** registration, login, logout, token refresh, email verification, password reset.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create account, send verification email |
| POST | `/auth/login` | Public | Email+password → access + refresh token pair |
| POST | `/auth/refresh` | Refresh token (cookie or body) | Rotate refresh token, issue new access token |
| POST | `/auth/logout` | Access token | Revoke current refresh token (single device) |
| POST | `/auth/logout-all` | Access token | Revoke all refresh tokens for the user |
| GET | `/auth/verify-email?token=` | Public | Confirm email via one-time token |
| POST | `/auth/resend-verification` | Public (rate-limited) | Resend verification email |
| POST | `/auth/forgot-password` | Public | Send password-reset token to email |
| POST | `/auth/reset-password` | Public | Consume reset token, set new password |

**Register DTO:** `email, password, confirmPassword, fullName` — password policy enforced via `class-validator` (min 8 chars, upper/lower/number/symbol).

**Login response:**
```json
{
  "accessToken": "jwt...",
  "refreshToken": "opaque-or-jwt...",
  "expiresIn": 900,
  "user": { "id": "...", "email": "...", "role": "USER", "emailVerified": false }
}
```

**Edge cases**
- Duplicate email on register → `409 Conflict`, generic message (don't leak whether email exists on *login* failures — same `401` for wrong email vs wrong password, to prevent user enumeration).
- Unverified email trying protected AI/search endpoints → `403` with `errorCode: EMAIL_NOT_VERIFIED` (configurable: block or just flag).
- Refresh token reuse detection: store refresh tokens hashed with a `used` flag; if a used/revoked token is presented again, revoke the *entire* token family (signals theft) and force re-login.
- Refresh token expiry (e.g., 30 days) vs access token expiry (e.g., 15 min) — configurable via env.
- Password reset token: single-use, short TTL (15–30 min), invalidate all other reset tokens for that user on use.
- Brute-force login protection: `@nestjs/throttler` per IP+email combo, exponential backoff or temporary lockout after N failures.
- Account not verified after N days → optional cleanup job (not required, note as future work).
- Logout with already-expired/invalid refresh token → idempotent `200`, not an error.

---

### 3.2 User Management Module (`/users`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/users/me` | JWT | any | Current user profile |
| PATCH | `/users/me` | JWT | any | Update name, avatar, preferences |
| PATCH | `/users/me/password` | JWT | any | Change password (requires current password) |
| DELETE | `/users/me` | JWT | any | Soft-delete own account |
| GET | `/users/:id` | JWT | ADMIN | Admin view of any user |

**Edge cases**
- Change password must invalidate all existing refresh tokens except optionally the current session.
- Delete account: soft delete (`deletedAt` timestamp) so chat history/usage logs retain referential integrity for analytics/billing; anonymize PII on hard-delete job if required by data policy.
- Prevent a user from elevating their own `role` via the update-profile DTO (whitelist fields explicitly; never trust client-sent `role`/`id`).
- Email change (if allowed) re-triggers verification and shouldn't be usable until re-verified.

---

### 3.3 Subscription Module (`/subscriptions`)

**Plans:** `FREE`, `PREMIUM` (extendable to `TEAM`/`ENTERPRISE` later). Each plan defines quotas (daily/monthly prompt count, max providers, search quota, streaming allowed y/n).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/subscriptions/plans` | Public | List available plans + pricing + limits |
| GET | `/subscriptions/me` | JWT | Current subscription status, renewal date, plan |
| POST | `/subscriptions/upgrade` | JWT | Upgrade to a paid plan (returns payment-intent / checkout URL if integrating Stripe) |
| POST | `/subscriptions/downgrade` | JWT | Schedule downgrade at period end |
| POST | `/subscriptions/cancel` | JWT | Cancel auto-renew |
| GET | `/subscriptions/usage` | JWT | Remaining requests, resets-at timestamp, per-feature breakdown |
| POST | `/subscriptions/webhook` | Signed webhook (e.g. Stripe) | Payment provider callback → sync subscription state |

**Usage response example:**
```json
{
  "plan": "FREE",
  "period": { "start": "2026-09-01", "end": "2026-10-01" },
  "chat": { "used": 42, "limit": 50, "remaining": 8 },
  "search": { "used": 5, "limit": 10, "remaining": 5 },
  "resetsAt": "2026-10-01T00:00:00Z"
}
```

**Edge cases**
- Usage counters must be atomic under concurrency (use a DB row-level `UPDATE ... SET used = used + 1 WHERE ... RETURNING`, or Redis `INCR` with periodic flush to Postgres) — avoid race conditions from parallel requests exhausting quota incorrectly.
- Quota check must happen *before* the (costly) call to the external AI provider, with a second check on response to charge accurately if streaming length affects cost.
- Downgrade shouldn't immediately cut off access already paid for — apply at period end, not instantly, unless user explicitly requests immediate cancellation.
- Failed payment webhook → mark subscription `PAST_DUE`, grace period, then auto-downgrade to `FREE`.
- Idempotency: webhook handlers must dedupe by provider event ID (store processed event IDs) since payment providers retry.

---

### 3.4 AI Provider Management Module (`/providers`)

Supports OpenAI, Anthropic (Claude), Gemini — each user can register their **own** API keys (bring-your-own-key model, common for such extensions), or the platform can offer managed/default keys for premium users. Design supports both.

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/providers` | JWT | any | List user's configured providers |
| POST | `/providers` | JWT | any | Add a provider config (type, apiKey, label) |
| GET | `/providers/:id` | JWT | any (owner) | Provider details (key masked) |
| PATCH | `/providers/:id` | JWT | any (owner) | Edit label/model/settings |
| PATCH | `/providers/:id/rotate-key` | JWT | any (owner) | Replace stored API key |
| DELETE | `/providers/:id` | JWT | any (owner) | Remove provider |
| PATCH | `/providers/:id/toggle` | JWT | any (owner) | Enable/disable |
| POST | `/providers/:id/set-default` | JWT | any (owner) | Mark as default provider |
| GET | `/providers/:id/health` | JWT | any (owner) | Ping provider with a minimal request, return latency/status |
| GET | `/providers/supported` | Public | — | List of supported provider *types* + required fields per type |

**Edge cases**
- API keys are **never** returned in full in any response — always masked (`sk-...abcd`), decrypted only server-side at the moment of use.
- Encryption: AES-256-GCM with a per-record IV, master key from env/secret manager, never logged.
- Health check must have a strict timeout (e.g., 5s) and must not consume the user's usage quota.
- Only one provider can be `isDefault=true` per user — enforce via transaction (unset old default, set new).
- Deleting the default provider: auto-promote another enabled provider to default, or leave null and require selection on next chat.
- Disabled provider must be filtered out of "available providers" selection in Chat module but still visible in the list.
- Validate API key format per provider type at creation (basic shape/prefix check) before persisting; real validation happens on first health check.
- Rate-limit provider-add attempts to prevent key-guessing abuse.

---

### 3.5 Chat Module (`/chats`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/chats` | JWT | Create a new conversation (optional title) |
| GET | `/chats` | JWT | List user's conversations (paginated) |
| GET | `/chats/:id` | JWT | Conversation detail + messages (paginated) |
| PATCH | `/chats/:id` | JWT | Rename conversation |
| DELETE | `/chats/:id` | JWT | Delete conversation (cascade messages) |
| POST | `/chats/:id/messages` | JWT | Send prompt → get AI response (sync) |
| POST | `/chats/:id/messages/stream` | JWT | Send prompt → SSE/WebSocket streamed response (bonus) |
| GET | `/chats/:id/messages` | JWT | Paginated message history |
| DELETE | `/chats/:id/messages/:messageId` | JWT | Delete a single message |

**Send-message request:**
```json
{
  "content": "Explain event loops in Node.js",
  "providerId": "uuid | null (use default)",
  "model": "gpt-4o | claude-sonnet-4-5 | gemini-1.5-pro (optional override)",
  "stream": false
}
```

**Edge cases**
- Enforce subscription quota check *before* provider call (§3.3); return `429` with `errorCode: QUOTA_EXCEEDED` and `resetsAt` when exhausted.
- If `providerId` omitted, fall back to user's default; if no default and no providers configured → `400 NO_PROVIDER_CONFIGURED` with a helpful message.
- If provider disabled or deleted between selection and call → `409` with clear error, don't silently fall back.
- Upstream provider errors (timeout, invalid key, rate-limited by provider, content-filtered) must be normalized into EchoGPT's own error envelope, not leaked raw.
- Long-running/streaming calls: guard against client disconnect (abort the upstream request), and cap max tokens/response size server-side regardless of what the client requests.
- Conversation ownership check on every message/detail/delete call — a user must never read another user's chat via ID guessing (UUID + explicit `WHERE userId = req.user.id`).
- Store both the prompt and response, plus `providerId`, `model`, `tokenUsage` (prompt/completion/total) per message for billing/analytics.
- Idempotency key support (optional header) to avoid double-submitting the same prompt on client retry.

---

### 3.6 Web Search Module (`/search`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/search` | JWT | Execute an AI-assisted web search |
| GET | `/search/history` | JWT | Paginated search history |
| GET | `/search/recent` | JWT | Last N searches (quick-access) |
| GET | `/search/suggestions?q=` | JWT | Typeahead suggestions |
| DELETE | `/search/history/:id` | JWT | Delete one history entry |
| DELETE | `/search/history` | JWT | Clear all history |

**Edge cases**
- Cache identical queries (normalized: lowercased, trimmed, hashed) in Redis with a short TTL (e.g., 10–30 min) to cut cost and latency — cache key should include search-provider/engine version so stale formats aren't served after upgrades.
- Suggestions endpoint must debounce-friendly (cheap, fast, no quota consumption) — backed by a trigram/prefix index or a lightweight cached popular-queries list, not a full AI call.
- Search also consumes subscription quota (separate counter from chat) — same atomicity concerns as §3.3.
- Sanitize/validate query length (min 2 chars, max e.g. 500) to avoid abuse.
- Empty/no-result searches should still be logged (for analytics) but clearly flagged `resultCount: 0`.

---

### 3.7 Admin Module (`/admin`)

All routes behind `JWT + RolesGuard('ADMIN')`.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | Aggregate stats: total users, active today, MRR, requests today, error rate |
| GET | `/admin/users` | Paginated/filterable user list (search by email, plan, status) |
| GET | `/admin/users/:id` | Full user detail (subscription, usage, providers count) |
| PATCH | `/admin/users/:id` | Update role/status (suspend/activate) |
| DELETE | `/admin/users/:id` | Hard-delete (with confirmation flag) |
| GET | `/admin/subscriptions` | All subscriptions, filter by plan/status |
| PATCH | `/admin/subscriptions/:id` | Manually override a subscription (support cases) |
| GET | `/admin/providers` | Platform-level provider config (managed keys, defaults, outage flags) |
| PATCH | `/admin/providers/:id` | Enable/disable a provider platform-wide (e.g., during an outage) |
| GET | `/admin/analytics/usage` | API usage analytics (by endpoint, by provider, over time) |
| GET | `/admin/logs/requests` | Paginated request logs, filterable by user/status/date |
| GET | `/admin/system/health` | DB, Redis, and each AI provider's health status |

**Edge cases**
- Admin listing endpoints must be paginated and indexed (see §5) — never `SELECT *` unfiltered on `users`/`requestLogs`.
- Suspending a user should immediately invalidate their active refresh tokens/sessions.
- Admin actions on sensitive fields (role changes, hard deletes) should write an `AuditLog` entry (`actorId, action, targetId, before, after, timestamp`).
- `/admin/system/health` should have its own short timeout per dependency check and never let one slow provider hang the whole endpoint (use `Promise.allSettled`).

---

## 4. Cross-Cutting Concerns

| Concern | Approach |
|---|---|
| Validation | `class-validator` + `class-transformer`, global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` |
| Auth guards | `JwtAuthGuard` (global, with `@Public()` decorator to opt out), `RolesGuard` (`@Roles('ADMIN')`) |
| Ownership guards | Resource-level guard/interceptor checking `resource.userId === req.user.id` for non-admins |
| Rate limiting | `@nestjs/throttler`, stricter limits on `/auth/*` and `/chats/*/messages`, tier-aware limits via a custom guard reading the user's plan |
| Logging | Structured JSON logs (pino/winston), request-id correlation via middleware, no PII/secrets in logs |
| Error handling | Global `AllExceptionsFilter` → consistent envelope (§10) |
| Config | `@nestjs/config` with a validated `env.schema.ts` (Joi/Zod) — app fails fast on missing/invalid env vars |
| Security headers | `helmet`, CORS restricted to the extension's origin(s), `express-rate-limit` at gateway if fronted by nginx |
| API versioning | URI versioning (`/api/v1/...`) via Nest's built-in `VersioningType.URI` |
| Soft deletes | `deletedAt` column pattern on `users`, `chats` (Prisma middleware or explicit `WHERE deletedAt IS NULL`) |

---

## 5. Database Schema (PostgreSQL)

Prisma-style schema summary — types adapt 1:1 to TypeORM entities if that ORM is chosen instead.

```prisma
enum Role {
  USER
  ADMIN
}

enum PlanType {
  FREE
  PREMIUM
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
}

enum ProviderType {
  OPENAI
  ANTHROPIC
  GEMINI
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

model User {
  id              String    @id @default(uuid())
  email           String    @unique
  passwordHash    String
  fullName        String
  role            Role      @default(USER)
  emailVerified   Boolean   @default(false)
  status          String    @default("ACTIVE") // ACTIVE | SUSPENDED
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  sessions        Session[]
  subscription    Subscription?
  providers       AiProvider[]
  chats           Chat[]
  searches        SearchQuery[]
  usageLogs       ApiUsageLog[]
  auditLogsActor  AuditLog[] @relation("AuditActor")

  @@index([email])
  @@index([role])
  @@index([status])
  @@index([deletedAt])
}

model Session {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshTokenHash String   @unique
  userAgent       String?
  ipAddress       String?
  familyId        String    // groups rotated tokens for reuse-detection
  revoked         Boolean   @default(false)
  expiresAt       DateTime
  createdAt       DateTime  @default(now())

  @@index([userId])
  @@index([familyId])
  @@index([expiresAt])
}

model Subscription {
  id              String    @id @default(uuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan            PlanType  @default(FREE)
  status          SubscriptionStatus @default(ACTIVE)
  periodStart     DateTime  @default(now())
  periodEnd       DateTime
  cancelAtPeriodEnd Boolean @default(false)
  chatLimit       Int       @default(50)
  chatUsed        Int       @default(0)
  searchLimit     Int       @default(10)
  searchUsed      Int       @default(0)
  externalRef     String?   // payment provider subscription id
  updatedAt       DateTime  @updatedAt

  @@index([status])
  @@index([periodEnd])
}

model AiProvider {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  type            ProviderType
  label           String
  apiKeyEncrypted String    // AES-256-GCM ciphertext
  apiKeyIv        String
  defaultModel    String?
  isDefault       Boolean   @default(false)
  isEnabled       Boolean   @default(true)
  lastHealthCheck DateTime?
  lastHealthOk    Boolean?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([userId, isDefault], map: "uniq_user_default_provider") // enforced additionally at app layer via transaction
  @@index([userId])
  @@index([userId, type])
  @@index([isEnabled])
}

model Chat {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title           String    @default("New Conversation")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  messages        Message[]

  @@index([userId, updatedAt])
  @@index([deletedAt])
}

model Message {
  id              String    @id @default(uuid())
  chatId          String
  chat            Chat      @relation(fields: [chatId], references: [id], onDelete: Cascade)
  role            MessageRole
  content         String    @db.Text
  providerId      String?
  model           String?
  promptTokens    Int?
  completionTokens Int?
  totalTokens     Int?
  createdAt       DateTime  @default(now())

  @@index([chatId, createdAt])
}

model SearchQuery {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  query           String
  queryHash       String    // normalized hash for cache/dedupe
  resultCount     Int       @default(0)
  cached          Boolean   @default(false)
  createdAt       DateTime  @default(now())

  @@index([userId, createdAt])
  @@index([queryHash])
}

model ApiUsageLog {
  id              String    @id @default(uuid())
  userId          String?
  user            User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  endpoint        String
  method          String
  statusCode      Int
  latencyMs       Int
  providerType    ProviderType?
  createdAt       DateTime  @default(now())

  @@index([userId, createdAt])
  @@index([endpoint, createdAt])
  @@index([statusCode])
}

model AuditLog {
  id              String    @id @default(uuid())
  actorId         String
  actor           User      @relation("AuditActor", fields: [actorId], references: [id])
  action          String    // e.g. "USER_ROLE_CHANGE"
  targetType      String
  targetId        String
  before          Json?
  after           Json?
  createdAt       DateTime  @default(now())

  @@index([actorId, createdAt])
  @@index([targetType, targetId])
}
```

**Indexing rationale**
- `User.email` unique index → login lookups.
- `Session.refreshTokenHash` unique + `familyId` index → O(1) validation and fast reuse-detection revocation.
- `Chat(userId, updatedAt)` composite → the common "my conversations, most recent first" query.
- `Message(chatId, createdAt)` composite → paginated message history in order.
- `ApiUsageLog(endpoint, createdAt)` and `(userId, createdAt)` → both the admin analytics-by-endpoint view and the per-user history view are covered without a full scan.
- `SearchQuery.queryHash` → O(1) cache/dedupe lookups instead of `LIKE` scans on raw text.
- Soft-delete columns (`deletedAt`) indexed since most queries filter `WHERE deletedAt IS NULL`.

---

## 6. Folder Structure

```
echogpt-backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── env.schema.ts
│   │   └── configuration.ts
│   ├── common/
│   │   ├── decorators/        (Public, Roles, CurrentUser)
│   │   ├── filters/           (all-exceptions.filter.ts)
│   │   ├── guards/            (jwt-auth.guard.ts, roles.guard.ts, ownership.guard.ts)
│   │   ├── interceptors/      (logging, transform-response)
│   │   ├── pipes/
│   │   └── dto/                (pagination.dto.ts, error-response.dto.ts)
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── prisma.service.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── strategies/     (jwt.strategy.ts, refresh.strategy.ts)
│   │   │   └── dto/
│   │   ├── users/
│   │   ├── subscriptions/
│   │   ├── providers/
│   │   │   ├── providers.controller.ts
│   │   │   ├── providers.service.ts
│   │   │   ├── encryption.service.ts
│   │   │   └── adapters/       (openai.adapter.ts, anthropic.adapter.ts, gemini.adapter.ts — common ProviderAdapter interface)
│   │   ├── chats/
│   │   ├── search/
│   │   └── admin/
│   ├── jobs/                    (BullMQ processors: usage-flush, streaming, cache-cleanup)
│   └── swagger/
│       └── swagger.setup.ts
├── test/
│   ├── unit/
│   └── e2e/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env.example
├── .eslintrc.js
├── nest-cli.json
├── package.json
├── README.md
└── postman/
    └── echogpt.postman_collection.json
```

**Key architectural note:** the AI Provider adapters share a common interface (`sendMessage`, `streamMessage`, `healthCheck`) so `ChatsService` and `ProvidersService` never branch on provider type directly — new providers plug in by adding one adapter class, keeping the system open/closed.

---

## 7. Authentication & Authorization Flow

1. Register → password hashed (argon2/bcrypt, cost tuned) → verification email queued.
2. Login → verify hash → issue access JWT (short-lived, contains `sub, role, jti`) + refresh token (random 256-bit, stored **hashed** in `Session`, family-tracked).
3. Every protected request → `JwtAuthGuard` validates access token signature/expiry → `RolesGuard`/ownership checks as needed.
4. Access token expires → client calls `/auth/refresh` with refresh token → server checks hash exists, not revoked, not expired → rotates (marks old as used, issues new pair in same family) → reuse of a used token revokes the whole family.
5. Logout → revoke the session row(s).

---

## 8. Subscription & Quota Enforcement Flow

1. Request hits `/chats/:id/messages` or `/search`.
2. `QuotaGuard` reads the user's `Subscription`, checks `used < limit` for the relevant counter.
3. If exceeded → `429 QUOTA_EXCEEDED` immediately, no provider call made.
4. If within quota → increment counter atomically (transaction or Redis `INCR` + async flush), proceed to call provider.
5. On provider success, log token usage in `Message`/`ApiUsageLog`.
6. On provider failure, **decrement/refund** the quota increment so users aren't charged for failed calls.
7. Nightly/cron job resets `chatUsed`/`searchUsed` to 0 and advances `periodStart/periodEnd` for subscriptions whose period has elapsed.

---

## 9. Swagger / OpenAPI Documentation Standards

- Global setup in `swagger.setup.ts`: title, description, version, `addBearerAuth()`.
- Every controller: `@ApiTags('Auth')` etc.
- Every route: `@ApiOperation({ summary })`, `@ApiResponse` for **each** realistic status code (200/201, 400, 401, 403, 404, 409, 429, 500), using dedicated response DTOs — not raw objects.
- Every DTO field: `@ApiProperty({ example, description })` so the generated docs are usable as a spec, not just types.
- Auth-protected routes: `@ApiBearerAuth('access-token')`.
- Group error responses under a shared `ErrorResponseDto` (§10) referenced everywhere for consistency.
- Exported OpenAPI JSON (`/api-json`) used to auto-generate the Postman collection (via `openapi-to-postmanv2`), keeping Swagger as the single source of truth.

---

## 10. Standard API Response & Error Envelope

**Success:**
```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 134 }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "You have used all chat requests for this billing period.",
    "details": null
  },
  "requestId": "9f2c1b7a-..."
}
```

| HTTP Status | Used for |
|---|---|
| 400 | Validation failure |
| 401 | Missing/invalid/expired auth token |
| 403 | Authenticated but not authorized (role, email not verified, disabled resource) |
| 404 | Resource not found / not owned by requester (avoid leaking existence — treat "not yours" as 404, not 403) |
| 409 | Conflict (duplicate email, default-provider clash) |
| 422 | Semantically invalid (e.g., downgrade to current plan) |
| 429 | Rate limit or quota exceeded |
| 500 | Unhandled server error |
| 502/503 | Upstream AI provider unavailable |

---

## 11. Testing Strategy

- **Unit tests:** services in isolation, mocked Prisma client and provider adapters (Jest).
- **e2e tests:** Supertest against a test Postgres (docker-compose test profile), covering auth flow, quota enforcement, ownership guards.
- **Contract tests** for provider adapters against recorded/mocked responses (never hit real paid APIs in CI).
- Target: critical paths (auth, quota, provider key handling) at high coverage; overall project coverage tracked but secondary to correctness of these paths.

---

## 12. Implementation Order (Suggested Milestones)

1. **Foundation** — Nest project scaffold, Prisma schema + first migration, Docker compose (api/postgres/redis), global config/validation/error-filter setup, Swagger bootstrap.
2. **Auth module** — register/login/refresh/logout + guards + tests. *(Everything else depends on this.)*
3. **Users module** — profile CRUD, password change, soft delete.
4. **Subscriptions module** — plans, usage tracking, quota guard (stub payment webhook).
5. **Providers module** — CRUD + encryption service + adapter interface + one real adapter (e.g., OpenAI) wired end-to-end, then add Anthropic/Gemini adapters.
6. **Chats module** — conversation + message CRUD, wired to provider adapters, quota-gated.
7. **Search module** — search endpoint + caching + history.
8. **Admin module** — dashboard, user/subscription/provider management, logs, audit trail.
9. **Bonus layer** — streaming (SSE/WebSocket), email verification flow, search-result caching polish, request-log analytics dashboards.
10. **Hardening pass** — rate limits tuned per plan, security review (helmet/CORS/secrets), Postman collection export, README + `.env.example` finalize, seed script for demo data.

> **ORM note:** if TypeORM is preferred over Prisma, the same table/column/index design applies 1:1 — swap `schema.prisma` for TypeORM entity classes + migration files, and `PrismaService` for a `TypeOrmModule.forRootAsync` config. The module boundaries and endpoint contracts above don't change either way.

---

## 13. Non-Functional Requirements

- **Security:** OWASP API Top 10 addressed — broken auth (rotating refresh + reuse detection), excessive data exposure (masked keys, DTO whitelisting), lack of rate limiting (throttler), mass assignment (whitelisted DTOs), injection (Prisma parameterizes by default; no raw SQL string concatenation).
- **Scalability:** stateless API (JWT, no in-memory session) → horizontally scalable behind a load balancer; Redis for shared cache/rate-limit state across instances; heavy AI calls offloaded to a queue for streaming/long-running cases.
- **Observability:** structured logs with request-id, `/admin/system/health` endpoint, `ApiUsageLog` table doubling as a lightweight analytics source.
- **Maintainability:** one module = one bounded context; DTOs separate from Prisma models; provider adapters isolate third-party SDK churn from business logic.

---

## 14. Submission Checklist (mapped to assignment requirements)

- [ ] GitHub repo with meaningful, incremental commit history (one milestone per PR/commit group from §12)
- [ ] README: setup steps, env vars, migration commands, how to run tests, how to run via Docker
- [ ] `prisma/migrations/` (or TypeORM migration files) checked in
- [ ] Swagger UI live at `/api/docs`, plus exported `openapi.json`
- [ ] `.env.example` with every required variable documented (see below)
- [ ] Postman collection generated from OpenAPI spec (optional but recommended)
- [ ] Seed script for demo admin + sample data

**`.env.example` (representative):**
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/echogpt
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
ENCRYPTION_MASTER_KEY=change-me-32-bytes
MAIL_FROM=no-reply@echogpt.dev
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CORS_ORIGINS=chrome-extension://negimdcamohmoheiifgecbjgjepkcfhj
```

---

*End of PRD.*
