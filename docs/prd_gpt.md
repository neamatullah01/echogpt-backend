# EchoGPT Backend REST API — Product Requirements & Implementation Plan

## 1. Document Information

- **Project:** EchoGPT Backend REST API
- **Assignment:** Software Engineering Internship (Backend) – AppifyDevs
- **Primary Goal:** Build a production-ready, secure, maintainable backend for the EchoGPT Chrome Extension.
- **Backend Stack:** NestJS + PostgreSQL + Prisma + JWT + Swagger/OpenAPI
- **Optional/Recommended:** Docker, Redis, automated tests, CI
- **Architecture:** Modular Clean Architecture / feature-based NestJS architecture
- **API Prefix:** `/api/v1`
- **Authentication:** Short-lived access token + rotating refresh token
- **Primary Roles:** `USER`, `ADMIN`

---

# 2. Product Overview

EchoGPT is a Chrome-extension-oriented AI assistant backend. The backend must provide:

1. Secure authentication and session management.
2. User profile and account management.
3. Free/Premium subscription management.
4. Multi-provider AI configuration.
5. Chat/conversation APIs.
6. AI-assisted web search APIs.
7. Usage tracking and limits.
8. Admin analytics and management APIs.
9. Swagger/OpenAPI documentation.
10. Strong validation, authorization, error handling, logging, and security controls.

The implementation should be designed so that additional AI providers, plans, usage rules, and features can be added without rewriting the core architecture.

---

# 3. Core Product Principles

- **Security first:** Never expose passwords, refresh tokens, or raw provider API keys.
- **RESTful design:** Consistent resources, HTTP methods, status codes, and response structures.
- **Separation of concerns:** Controllers handle HTTP concerns; services contain business logic; repositories/data-access handle persistence.
- **Provider abstraction:** Chat/search business logic must not depend directly on one AI provider.
- **Usage enforcement:** Every billable/limited operation must pass through a centralized usage/entitlement service.
- **Auditable operations:** Important user/admin/provider/subscription actions should be logged.
- **Idempotency:** Operations that can create duplicate side effects should support idempotency where appropriate.
- **Fail safely:** Provider failures must not expose secrets or internal implementation details.
- **Observable:** Errors, latency, provider status, request usage, and important security events should be traceable.
- **API versioning:** All public endpoints start under `/api/v1`.

---

# 4. Proposed Technology Stack

## Required

| Area | Technology |
|---|---|
| Runtime | Node.js |
| Framework | NestJS |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT |
| Password hashing | Argon2id preferred |
| API documentation | Swagger / OpenAPI |
| Validation | class-validator + class-transformer |
| Configuration | @nestjs/config |
| HTTP client | Axios / NestJS HttpModule |
| Testing | Jest + Supertest |

## Recommended

| Area | Technology |
|---|---|
| Cache / rate limiting | Redis |
| Queue | BullMQ |
| Containerization | Docker + Docker Compose |
| Logging | Pino / structured logging |
| API security | Helmet + CORS + throttling |
| API key encryption | AES-256-GCM with server-side encryption key |
| CI | GitHub Actions |
| API client collection | Postman |

---

# 5. Functional Scope

## Phase 1 — Project Foundation

### Goals

- Initialize NestJS project.
- Configure TypeScript.
- Configure environment variables.
- Configure Prisma.
- Connect PostgreSQL.
- Configure Swagger.
- Configure global validation.
- Configure global exception handling.
- Configure logging.
- Configure API versioning/prefix.
- Configure CORS and security headers.
- Add Docker setup.

### Initial endpoint

`GET /api/v1/health`

Example response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "up",
    "timestamp": "2026-09-25T04:20:00.000Z"
  }
}
```

---

# 6. Authentication Module

## 6.1 Registration

### Endpoint

`POST /api/v1/auth/register`

### Request

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPassword123!"
}
```

### Requirements

- Normalize email to lowercase.
- Trim name/email.
- Validate password complexity.
- Reject duplicate email.
- Hash password using Argon2id.
- Assign default `USER` role.
- Assign default `FREE` subscription.
- Create session/device record after successful authentication if registration also logs the user in.
- Do not return password/hash.

### Edge Cases

- Duplicate email.
- Email with leading/trailing spaces.
- Invalid email.
- Weak password.
- Password too long.
- Empty name.
- SQL injection attempt.
- Duplicate concurrent registration.
- Transaction failure during user + subscription creation.

---

## 6.2 Login

### Endpoint

`POST /api/v1/auth/login`

### Request

```json
{
  "email": "john@example.com",
  "password": "StrongPassword123!"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "opaque-or-jwt-refresh-token",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER"
    }
  }
}
```

### Security

- Do not reveal whether email exists.
- Rate-limit login attempts.
- Log failed authentication attempts.
- Rotate refresh token after use.
- Revoke previous refresh token family on token reuse detection.

---

## 6.3 Refresh Token

### Endpoint

`POST /api/v1/auth/refresh`

### Request

```json
{
  "refreshToken": "refresh-token"
}
```

### Requirements

- Validate refresh token.
- Check session status.
- Check expiry.
- Rotate refresh token.
- Invalidate old refresh token.
- Issue new access token.
- Detect refresh-token reuse.

---

## 6.4 Logout

### Endpoint

`POST /api/v1/auth/logout`

Authentication: Required.

### Request

```json
{
  "refreshToken": "refresh-token"
}
```

### Behavior

- Revoke current session/refresh token.
- Make token unusable immediately.

---

## 6.5 Logout All Devices

### Endpoint

`POST /api/v1/auth/logout-all`

Authentication: Required.

Revokes every active session belonging to the user.

---

## 6.6 Email Verification — Bonus

### Endpoint

`POST /api/v1/auth/verify-email`

```json
{
  "token": "verification-token"
}
```

### Resend

`POST /api/v1/auth/resend-verification`

Requirements:

- Token expiration.
- One-time-use token.
- Rate limit resend requests.
- Do not reveal sensitive account state.

---

# 7. User Management

## Get Current Profile

`GET /api/v1/users/me`

Authentication required.

## Update Profile

`PATCH /api/v1/users/me`

```json
{
  "name": "Updated Name"
}
```

## Change Password

`PATCH /api/v1/users/me/password`

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

### Security Behavior

After password change:

- Revoke all existing refresh sessions, except optionally the current session if product requirements explicitly allow it.
- Require re-authentication.
- Log security event.

## Delete Account

`DELETE /api/v1/users/me`

### Requirements

- Require password or recent authentication.
- Prefer soft delete for auditability.
- Anonymize personally identifiable information where required.
- Revoke all sessions.
- Prevent deleted account from authenticating.
- Preserve non-PII analytics where appropriate.

---

# 8. Roles & Authorization

## Roles

```text
USER
ADMIN
```

Use NestJS guards:

- `JwtAuthGuard`
- `RolesGuard`

Example:

```text
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
```

### Authorization Rules

| Resource | USER | ADMIN |
|---|---:|---:|
| Own profile | CRUD | CRUD |
| Own chats | CRUD | CRUD |
| Own searches | CRUD/read | CRUD/read |
| Own subscription | Read/change plan | Read/change |
| Provider management | No | Yes |
| User management | No | Yes |
| System analytics | No | Yes |
| Usage logs | Own | All |
| Health | Basic | Detailed |

---

# 9. Subscription Module

## Subscription Plans

Minimum plans:

```text
FREE
PREMIUM
```

Recommended plan configuration:

```text
FREE
- Monthly chat requests: configurable
- Monthly search requests: configurable
- Available providers: configurable
- Maximum prompt size: configurable

PREMIUM
- Higher limits
- More providers
- Higher prompt limits
- Premium features
```

Do not hard-code these limits inside controllers.

Store plan configuration in database or a centralized entitlement configuration.

---

## Get Current Subscription

`GET /api/v1/subscriptions/me`

Example:

```json
{
  "success": true,
  "data": {
    "plan": "PREMIUM",
    "status": "ACTIVE",
    "currentPeriodStart": "2026-09-01T00:00:00Z",
    "currentPeriodEnd": "2026-10-01T00:00:00Z",
    "usage": {
      "chat": 80,
      "search": 25
    },
    "limits": {
      "chat": 500,
      "search": 100
    }
  }
}
```

---

## Upgrade Subscription

`POST /api/v1/subscriptions/upgrade`

```json
{
  "plan": "PREMIUM"
}
```

For the assignment, this can be implemented as a simulated/internal subscription operation unless a real payment provider is explicitly required.

---

## Downgrade

`POST /api/v1/subscriptions/downgrade`

Rules:

- Prevent invalid plan.
- If downgrade is scheduled, retain current benefits until period end.
- Avoid immediately deleting premium entitlements unless business rules require it.
- Record subscription history.

---

## Remaining Requests

`GET /api/v1/subscriptions/usage`

Response:

```json
{
  "success": true,
  "data": {
    "chat": {
      "used": 25,
      "limit": 100,
      "remaining": 75
    },
    "search": {
      "used": 10,
      "limit": 50,
      "remaining": 40
    }
  }
}
```

### Usage Edge Cases

- Limit reached.
- Subscription expired.
- Subscription canceled.
- Monthly period rollover.
- Concurrent requests crossing the remaining limit.
- Failed AI provider request should not consume usage unless business policy says otherwise.
- Successful request followed by response persistence failure.
- Duplicate request/idempotency retry.

Usage increments should be atomic.

---

# 10. AI Provider Management

## Supported Providers

```text
OPENAI
ANTHROPIC
GOOGLE_GEMINI
```

The design must allow future providers.

## Provider Entity Concept

Each provider can contain:

- Provider type.
- Display name.
- API key (encrypted).
- Default model.
- Enabled/disabled status.
- Default provider flag.
- Configuration JSON.
- Health status.
- Last health check timestamp.

---

## Admin: List Providers

`GET /api/v1/admin/providers`

## Admin: Get Provider

`GET /api/v1/admin/providers/:id`

## Admin: Add Provider

`POST /api/v1/admin/providers`

```json
{
  "provider": "OPENAI",
  "name": "OpenAI Primary",
  "apiKey": "secret",
  "defaultModel": "gpt-model",
  "isEnabled": true
}
```

### Critical Security Requirement

Never return the raw API key.

Example response:

```json
{
  "id": "uuid",
  "provider": "OPENAI",
  "name": "OpenAI Primary",
  "maskedApiKey": "sk-****abcd",
  "isEnabled": true,
  "isDefault": true
}
```

---

## Edit Provider

`PATCH /api/v1/admin/providers/:id`

## Delete Provider

`DELETE /api/v1/admin/providers/:id`

Before deletion:

- If provider is default, reject deletion until another provider is selected.
- Check active conversations/jobs if relevant.
- Preserve usage history.

## Enable/Disable

`PATCH /api/v1/admin/providers/:id/status`

```json
{
  "isEnabled": false
}
```

## Set Default

`PATCH /api/v1/admin/providers/:id/default`

Only one active default provider should exist.

This must be enforced transactionally.

## Health Check

`POST /api/v1/admin/providers/:id/health`

Health check should:

- Verify credentials.
- Test provider connectivity.
- Use a safe lightweight operation.
- Avoid logging API keys.
- Store health result and timestamp.
- Apply timeout.

Possible result:

```json
{
  "status": "HEALTHY",
  "latencyMs": 420
}
```

---

# 11. Provider Abstraction

Do not write provider-specific logic directly inside `ChatService`.

Recommended design:

```text
AiProviderService
    |
    +-- OpenAiAdapter
    +-- AnthropicAdapter
    +-- GeminiAdapter
```

Interface:

```ts
interface AiProviderAdapter {
  generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput>;
  healthCheck(): Promise<ProviderHealthResult>;
}
```

This allows new providers to be added without changing the chat controller.

---

# 12. Chat Module

## Create Conversation

`POST /api/v1/chats`

```json
{
  "title": "Learning NestJS"
}
```

## List Conversations

`GET /api/v1/chats?page=1&limit=20`

Only return conversations belonging to authenticated user.

## Get Conversation

`GET /api/v1/chats/:conversationId`

## Rename Conversation

`PATCH /api/v1/chats/:conversationId`

```json
{
  "title": "NestJS Learning"
}
```

## Delete Conversation

`DELETE /api/v1/chats/:conversationId`

---

# 13. Send Prompt

`POST /api/v1/chats/:conversationId/messages`

Request:

```json
{
  "prompt": "Explain dependency injection in NestJS.",
  "providerId": "optional-provider-id",
  "model": "optional-model"
}
```

Flow:

```text
Request
  ↓
JWT Authentication
  ↓
Validate conversation ownership
  ↓
Check subscription entitlement
  ↓
Check usage limit
  ↓
Resolve provider
  ↓
Validate provider availability
  ↓
Load relevant conversation history
  ↓
Call provider adapter
  ↓
Persist user message
  ↓
Persist assistant response
  ↓
Create API usage log
  ↓
Return response
```

### Important Transaction Boundary

Do not hold a database transaction open while waiting for an external AI provider.

Recommended approach:

1. Validate and reserve usage atomically.
2. Call provider.
3. Persist result.
4. If provider fails, release/rollback the usage reservation according to the usage policy.

---

# 14. Chat Edge Cases

Must handle:

- Conversation does not exist.
- Conversation belongs to another user.
- Empty prompt.
- Prompt exceeds maximum length.
- Unsupported provider.
- Disabled provider.
- Provider unavailable.
- Invalid provider credentials.
- Provider timeout.
- Provider rate limit.
- Provider quota exhausted.
- AI response empty.
- AI provider returns malformed data.
- User reaches subscription limit.
- Concurrent requests exceed limit.
- Database failure after provider response.
- Duplicate client retry.
- Very large conversation history.
- Sensitive data accidentally included in logs.

Never expose provider internal errors directly to the client.

Example safe error:

```json
{
  "success": false,
  "error": {
    "code": "AI_PROVIDER_UNAVAILABLE",
    "message": "The selected AI provider is temporarily unavailable."
  }
}
```

---

# 15. Conversation History

Recommended entities:

```text
Conversation
Message
```

Message fields:

- `id`
- `conversationId`
- `role`
- `content`
- `provider`
- `model`
- `tokenUsage`
- `createdAt`

Roles:

```text
USER
ASSISTANT
SYSTEM
```

For privacy/security, avoid storing unnecessary provider metadata or sensitive provider payloads.

---

# 16. Streaming Response — Bonus

Endpoint:

`POST /api/v1/chats/:conversationId/messages/stream`

Possible implementation:

- Server-Sent Events (SSE).
- NestJS `@Sse()`.
- Provider adapter exposes streaming interface.

Flow:

```text
Client
  ↓
POST/stream
  ↓
Authentication + entitlement check
  ↓
Provider streaming API
  ↓
SSE chunks
  ↓
Final response persistence
```

Edge cases:

- Client disconnects.
- Provider stream fails midway.
- Partial response.
- Timeout.
- Usage accounting.
- Final persistence failure.

---

# 17. Web Search Module

The backend should abstract the search provider so a search provider can be replaced later.

Recommended architecture:

```text
SearchService
    |
    +-- SearchProviderAdapter
```

A concrete provider can be selected through environment configuration or provider records.

---

# 18. Search Query

`POST /api/v1/search`

Request:

```json
{
  "query": "latest NestJS documentation",
  "limit": 10
}
```

Response:

```json
{
  "success": true,
  "data": {
    "query": "latest NestJS documentation",
    "results": [
      {
        "title": "Result title",
        "url": "https://example.com",
        "snippet": "Result snippet"
      }
    ]
  }
}
```

### Requirements

- Validate query.
- Apply subscription limit.
- Apply maximum result count.
- Track usage.
- Save search history.
- Do not allow SSRF through arbitrary backend URL fetching.
- Sanitize returned data.
- Apply provider timeout.

---

# 19. Search History

## List History

`GET /api/v1/search/history?page=1&limit=20`

## Recent Searches

`GET /api/v1/search/recent?limit=10`

## Search Suggestions

`GET /api/v1/search/suggestions?q=nest`

Suggestions may be generated from:

- User's previous searches.
- Popular searches.
- Safe predefined suggestions.

Never leak one user's private search history to another user.

---

# 20. Search Caching — Bonus

Recommended Redis key:

```text
search:{sha256(normalizedQuery)}:{provider}:{limit}
```

Requirements:

- TTL.
- Cache only safe normalized queries/results.
- Avoid storing private user-specific data in shared cache.
- Prevent cache poisoning.
- Do not treat cached results as fresh indefinitely.

---

# 21. Admin Module

All admin endpoints require:

```text
JWT + ADMIN role
```

---

# 22. Admin Dashboard

`GET /api/v1/admin/dashboard`

Return aggregate statistics such as:

```json
{
  "users": {
    "total": 1000,
    "active": 850
  },
  "subscriptions": {
    "free": 800,
    "premium": 200
  },
  "usage": {
    "chatRequests": 25000,
    "searchRequests": 8000
  },
  "providers": {
    "enabled": 3,
    "healthy": 2
  }
}
```

Do not expose individual user secrets.

---

# 23. Admin User Management

## List Users

`GET /api/v1/admin/users?page=1&limit=20&search=&role=&status=`

## Get User

`GET /api/v1/admin/users/:id`

## Update User

`PATCH /api/v1/admin/users/:id`

## Change User Role

`PATCH /api/v1/admin/users/:id/role`

```json
{
  "role": "ADMIN"
}
```

## Suspend User

`PATCH /api/v1/admin/users/:id/status`

```json
{
  "status": "SUSPENDED"
}
```

### Security

Prevent an admin from accidentally removing the last administrative account unless an explicit recovery mechanism exists.

---

# 24. Admin Subscription Management

`GET /api/v1/admin/subscriptions`

`GET /api/v1/admin/subscriptions/:id`

`PATCH /api/v1/admin/subscriptions/:id`

`POST /api/v1/admin/subscriptions/:userId/activate`

`POST /api/v1/admin/subscriptions/:userId/cancel`

---

# 25. API Usage Analytics

## Usage Summary

`GET /api/v1/admin/analytics/usage`

Supported filters:

```text
from
to
provider
model
operation
userId
```

## Usage by Provider

`GET /api/v1/admin/analytics/providers`

## Usage by Day

`GET /api/v1/admin/analytics/daily`

Important metrics:

- Total requests.
- Successful requests.
- Failed requests.
- Average latency.
- Provider usage.
- Chat usage.
- Search usage.
- Subscription-plan usage.
- Estimated token usage where available.

---

# 26. Request Logs

`GET /api/v1/admin/logs/requests`

Filters:

- method
- path
- statusCode
- userId
- requestId
- from
- to

Never store:

- passwords
- JWTs
- refresh tokens
- raw API keys
- sensitive authorization headers
- full sensitive request bodies

---

# 27. System Health

## Public Basic Health

`GET /api/v1/health`

## Detailed Admin Health

`GET /api/v1/admin/system/health`

Check:

- Application.
- PostgreSQL.
- Redis if enabled.
- AI providers.
- Queue if enabled.

Return overall status:

```text
healthy
degraded
unhealthy
```

---

# 28. API Response Standard

All successful responses should follow:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

For paginated responses:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

# 29. Error Response Standard

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found.",
    "details": null,
    "requestId": "req_123"
  }
}
```

Recommended error codes:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
RESOURCE_NOT_FOUND
DUPLICATE_RESOURCE
INVALID_CREDENTIALS
ACCOUNT_SUSPENDED
TOKEN_EXPIRED
TOKEN_REVOKED
RATE_LIMIT_EXCEEDED
USAGE_LIMIT_EXCEEDED
SUBSCRIPTION_REQUIRED
PROVIDER_DISABLED
PROVIDER_UNAVAILABLE
PROVIDER_TIMEOUT
EXTERNAL_SERVICE_ERROR
INTERNAL_SERVER_ERROR
```

Do not expose stack traces in production.

---

# 30. HTTP Status Code Rules

| Status | Usage |
|---|---|
| 200 | Successful read/update/action |
| 201 | Resource created |
| 204 | Successful deletion with no body |
| 400 | Invalid request |
| 401 | Missing/invalid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict |
| 422 | Semantically invalid input if used |
| 429 | Rate limit / usage limit |
| 500 | Unexpected server error |
| 502 | External provider failure |
| 503 | Service unavailable |
| 504 | Provider timeout |

---

# 31. PostgreSQL Database Design

Use UUID primary keys.

Use:

```text
createdAt
updatedAt
```

on mutable business entities.

Use PostgreSQL enums where appropriate.

---

# 32. Core Database Entities

Minimum required:

- Users
- Sessions
- Roles
- Subscriptions
- AI Providers
- Chat History
- Web Searches
- API Usage Logs

Recommended additional entities:

- Subscription Plans
- Subscription History
- Conversations
- Messages
- Search Results
- Email Verification Tokens
- Audit Logs
- Refresh Token Sessions

---

# 33. Proposed Prisma Schema

The following is the logical schema. Exact Prisma syntax can be adjusted during implementation.

```prisma
enum RoleName {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  DELETED
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  EXPIRED
  PENDING
}

enum AiProviderType {
  OPENAI
  ANTHROPIC
  GOOGLE_GEMINI
}

enum ProviderHealthStatus {
  UNKNOWN
  HEALTHY
  UNHEALTHY
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

enum UsageOperation {
  CHAT
  SEARCH
}

model User {
  id              String        @id @default(uuid())
  name            String
  email           String        @unique
  passwordHash    String
  emailVerified   Boolean       @default(false)
  status          UserStatus    @default(ACTIVE)

  roleId          String
  role            Role          @relation(fields: [roleId], references: [id])

  sessions        Session[]
  subscription    Subscription?
  conversations   Conversation[]
  searches        WebSearch[]
  usageLogs       ApiUsageLog[]
  auditLogs       AuditLog[]    @relation("AuditActor")

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?

  @@index([roleId])
  @@index([status])
}

model Role {
  id          String   @id @default(uuid())
  name        RoleName @unique
  users       User[]
  createdAt   DateTime @default(now())
}

model Session {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  refreshTokenHash String   @unique
  userAgent       String?
  ipAddress       String?
  expiresAt       DateTime
  revokedAt       DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([expiresAt])
  @@index([revokedAt])
}

model SubscriptionPlan {
  id              String         @id @default(uuid())
  name            String         @unique
  monthlyChatLimit Int
  monthlySearchLimit Int
  maxPromptLength Int
  isActive        Boolean        @default(true)

  subscriptions   Subscription[]
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model Subscription {
  id              String              @id @default(uuid())
  userId          String              @unique
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  planId          String
  plan            SubscriptionPlan   @relation(fields: [planId], references: [id])

  status          SubscriptionStatus  @default(ACTIVE)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([planId])
  @@index([status])
}

model SubscriptionHistory {
  id              String              @id @default(uuid())
  userId          String
  fromPlan        String?
  toPlan          String
  status          SubscriptionStatus
  effectiveAt     DateTime            @default(now())
  metadata        Json?

  @@index([userId])
  @@index([effectiveAt])
}

model AiProvider {
  id              String              @id @default(uuid())
  type            AiProviderType
  name            String
  encryptedApiKey String
  defaultModel    String?
  config          Json?
  isEnabled       Boolean             @default(true)
  isDefault       Boolean             @default(false)
  healthStatus    ProviderHealthStatus @default(UNKNOWN)
  lastHealthCheck DateTime?

  conversations   Conversation[]
  usageLogs       ApiUsageLog[]

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([type])
  @@index([isEnabled])
}

model Conversation {
  id          String       @id @default(uuid())
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  title       String
  providerId  String?
  provider    AiProvider?  @relation(fields: [providerId], references: [id], onDelete: SetNull)

  messages    Message[]

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([userId, updatedAt])
  @@index([providerId])
}

model Message {
  id              String        @id @default(uuid())
  conversationId   String
  conversation    Conversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  role            MessageRole
  content         String
  providerType    AiProviderType?
  model           String?
  inputTokens     Int?
  outputTokens    Int?
  latencyMs       Int?

  createdAt       DateTime      @default(now())

  @@index([conversationId, createdAt])
}

model WebSearch {
  id            String       @id @default(uuid())
  userId        String
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  query         String
  provider      String?
  resultCount   Int?
  cached        Boolean      @default(false)

  createdAt     DateTime     @default(now())

  @@index([userId, createdAt])
  @@index([query])
}

model ApiUsageLog {
  id              String          @id @default(uuid())
  userId          String?
  user            User?           @relation(fields: [userId], references: [id], onDelete: SetNull)

  providerId      String?
  provider        AiProvider?     @relation(fields: [providerId], references: [id], onDelete: SetNull)

  operation       UsageOperation
  model           String?
  statusCode      Int?
  success         Boolean
  latencyMs       Int?
  inputTokens     Int?
  outputTokens    Int?
  requestId       String?
  errorCode       String?

  createdAt       DateTime        @default(now())

  @@index([userId, createdAt])
  @@index([providerId, createdAt])
  @@index([operation, createdAt])
  @@index([requestId])
}

model AuditLog {
  id          String   @id @default(uuid())
  actorUserId String?
  actor       User?    @relation("AuditActor", fields: [actorUserId], references: [id], onDelete: SetNull)

  action      String
  entityType  String
  entityId    String?
  metadata    Json?
  ipAddress   String?

  createdAt   DateTime @default(now())

  @@index([actorUserId, createdAt])
  @@index([entityType, entityId])
  @@index([action, createdAt])
}

model EmailVerificationToken {
  id          String   @id @default(uuid())
  userId      String
  tokenHash   String   @unique
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}
```

---

# 34. Database Design Rules

## Constraints

- Unique user email.
- Unique role name.
- Unique refresh-token hash.
- Valid subscription plan.
- Provider type validation.
- UUID identifiers.
- Foreign-key constraints.
- Cascading only where data ownership clearly requires it.

## Indexes

Required indexes should cover:

- User email.
- User status.
- Session userId.
- Session expiration.
- Subscription status.
- Conversation userId + updatedAt.
- Message conversationId + createdAt.
- Search userId + createdAt.
- Usage userId + createdAt.
- Usage providerId + createdAt.
- Audit entity + timestamp.

Avoid unnecessary indexes because they increase write cost.

---

# 35. Provider API Key Security

Provider API keys are extremely sensitive.

### Never:

- Return raw API keys.
- Store raw keys in normal logs.
- Store them in Git.
- Include them in Swagger example responses.
- Send them to the frontend.
- Include them in exception messages.

### Recommended approach

Encrypt using:

```text
AES-256-GCM
```

Environment variable:

```env
PROVIDER_ENCRYPTION_KEY=
```

Store only encrypted values in PostgreSQL.

At runtime:

```text
Encrypted DB value
        ↓
Decrypt inside provider service
        ↓
Use API key
        ↓
Never expose it outside backend
```

---

# 36. JWT Security Design

Use:

```text
Access Token
Refresh Token
```

Suggested access-token lifetime:

```text
15 minutes
```

Suggested refresh-token lifetime:

```text
7–30 days
```

Do not hard-code these values.

Use environment variables:

```env
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
```

For stronger security, store only a hash of the refresh token in the database.

---

# 37. Password Security

Use Argon2id.

Requirements:

- Minimum length.
- Complexity validation.
- No plaintext storage.
- No password in logs.
- Compare using secure password verification.
- Rate-limit login.
- Revoke sessions after password change.

---

# 38. Rate Limiting

Recommended limits:

```text
Login:
5 attempts / minute / IP

Registration:
5 / hour / IP

Refresh:
20 / minute / IP

Chat:
Depends on subscription

Search:
Depends on subscription

Admin:
Reasonable API rate limit
```

Use Redis-backed throttling for production.

Never rely only on frontend restrictions.

---

# 39. Request Correlation

Generate a unique:

```text
X-Request-ID
```

for every request.

Include it in:

- Logs.
- Error responses.
- Usage logs.
- Provider requests where safe.

Example:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Something went wrong.",
    "requestId": "req_abc123"
  }
}
```

---

# 40. Input Validation

Global NestJS validation:

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
})
```

Rules:

- Reject unknown properties.
- Validate UUIDs.
- Validate enum values.
- Validate pagination.
- Validate maximum lengths.
- Validate URLs.
- Normalize email.
- Trim strings where appropriate.

---

# 41. Pagination Standard

All list endpoints should support:

```text
?page=1&limit=20
```

Rules:

- Default page = 1.
- Default limit = 20.
- Maximum limit = 100.
- Reject negative page.
- Reject zero/negative limit.

---

# 42. Sorting & Filtering

Admin list endpoints should support controlled sorting:

```text
?sortBy=createdAt&sortOrder=desc
```

Never directly concatenate user-provided column names into SQL.

Use an allowlist:

```text
createdAt
updatedAt
name
email
```

---

# 43. CORS

Configure allowed origins using environment variables.

Example:

```env
CORS_ORIGINS=http://localhost:3000,chrome-extension://EXTENSION_ID
```

Do not use unrestricted `*` in production when authenticated APIs are involved.

---

# 44. Chrome Extension Considerations

The extension should communicate with the backend over HTTPS.

Production requirements:

```text
Chrome Extension
       ↓ HTTPS
EchoGPT API
       ↓
Auth
       ↓
Business Services
       ↓
PostgreSQL / Redis / AI Providers
```

Do not put provider API keys inside the Chrome extension.

The extension should only receive the user's own authentication/session credentials and API responses.

---

# 45. Swagger Documentation Requirements

Swagger URL:

`/docs`

Document every endpoint with:

- Summary.
- Description.
- Tags.
- Request body.
- Query parameters.
- Path parameters.
- Response schema.
- Success examples.
- Error examples.
- Authentication requirement.
- Required roles where applicable.

Use:

```ts
@ApiBearerAuth()
@ApiTags('Authentication')
@ApiOperation(...)
@ApiResponse(...)
```

Add schemas for:

```text
RegisterDto
LoginDto
RefreshTokenDto
UpdateProfileDto
ChangePasswordDto
CreateProviderDto
UpdateProviderDto
CreateConversationDto
SendMessageDto
SearchDto
PaginationDto
```

---

# 46. Recommended API Endpoint Map

## Authentication

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/resend-verification
```

## Users

```text
GET    /api/v1/users/me
PATCH  /api/v1/users/me
PATCH  /api/v1/users/me/password
DELETE /api/v1/users/me
```

## Subscriptions

```text
GET    /api/v1/subscriptions/me
GET    /api/v1/subscriptions/usage
POST   /api/v1/subscriptions/upgrade
POST   /api/v1/subscriptions/downgrade
```

## Chats

```text
POST   /api/v1/chats
GET    /api/v1/chats
GET    /api/v1/chats/:conversationId
PATCH  /api/v1/chats/:conversationId
DELETE /api/v1/chats/:conversationId
POST   /api/v1/chats/:conversationId/messages
POST   /api/v1/chats/:conversationId/messages/stream
```

## Search

```text
POST   /api/v1/search
GET    /api/v1/search/history
GET    /api/v1/search/recent
GET    /api/v1/search/suggestions
```

## Health

```text
GET    /api/v1/health
```

## Admin Users

```text
GET    /api/v1/admin/users
GET    /api/v1/admin/users/:id
PATCH  /api/v1/admin/users/:id
PATCH  /api/v1/admin/users/:id/role
PATCH  /api/v1/admin/users/:id/status
```

## Admin Subscriptions

```text
GET    /api/v1/admin/subscriptions
GET    /api/v1/admin/subscriptions/:id
PATCH  /api/v1/admin/subscriptions/:id
POST   /api/v1/admin/subscriptions/:userId/activate
POST   /api/v1/admin/subscriptions/:userId/cancel
```

## Admin Providers

```text
GET    /api/v1/admin/providers
GET    /api/v1/admin/providers/:id
POST   /api/v1/admin/providers
PATCH  /api/v1/admin/providers/:id
DELETE /api/v1/admin/providers/:id
PATCH  /api/v1/admin/providers/:id/status
PATCH  /api/v1/admin/providers/:id/default
POST   /api/v1/admin/providers/:id/health
```

## Admin Analytics

```text
GET    /api/v1/admin/dashboard
GET    /api/v1/admin/analytics/usage
GET    /api/v1/admin/analytics/providers
GET    /api/v1/admin/analytics/daily
GET    /api/v1/admin/logs/requests
GET    /api/v1/admin/system/health
```

---

# 47. Recommended Folder Structure

Use a feature-oriented modular structure:

```text
src/
├── main.ts
├── app.module.ts
│
├── config/
│   ├── configuration.ts
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── validation.schema.ts
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   │
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   │
│   ├── interceptors/
│   │   ├── request-id.interceptor.ts
│   │   └── logging.interceptor.ts
│   │
│   ├── filters/
│   │   └── global-exception.filter.ts
│   │
│   ├── pipes/
│   │
│   ├── dto/
│   │
│   ├── constants/
│   │
│   ├── enums/
│   │
│   ├── interfaces/
│   │
│   └── utils/
│
├── database/
│   ├── prisma.service.ts
│   └── prisma.module.ts
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   ├── guards/
│   ├── strategies/
│   │   ├── access-token.strategy.ts
│   │   └── refresh-token.strategy.ts
│   └── services/
│
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── dto/
│   └── repositories/
│
├── roles/
│   ├── roles.module.ts
│   └── roles.service.ts
│
├── subscriptions/
│   ├── subscriptions.module.ts
│   ├── subscriptions.controller.ts
│   ├── subscriptions.service.ts
│   ├── dto/
│   └── services/
│
├── ai/
│   ├── ai.module.ts
│   ├── ai-provider.service.ts
│   ├── interfaces/
│   │   └── ai-provider.interface.ts
│   └── adapters/
│       ├── openai.adapter.ts
│       ├── anthropic.adapter.ts
│       └── gemini.adapter.ts
│
├── providers/
│   ├── providers.module.ts
│   ├── providers.controller.ts
│   ├── providers.service.ts
│   ├── dto/
│   └── crypto/
│       └── provider-key.service.ts
│
├── chats/
│   ├── chats.module.ts
│   ├── chats.controller.ts
│   ├── chats.service.ts
│   ├── dto/
│   └── services/
│
├── search/
│   ├── search.module.ts
│   ├── search.controller.ts
│   ├── search.service.ts
│   ├── dto/
│   └── providers/
│
├── usage/
│   ├── usage.module.ts
│   ├── usage.service.ts
│   └── usage.repository.ts
│
├── admin/
│   ├── admin.module.ts
│   ├── dashboard/
│   ├── users/
│   ├── subscriptions/
│   ├── providers/
│   ├── analytics/
│   └── system-health/
│
├── health/
│   ├── health.module.ts
│   └── health.controller.ts
│
└── prisma/
    ├── schema.prisma
    ├── migrations/
    └── seed.ts
```

---

# 48. Clean Architecture Boundaries

For important modules use:

```text
Controller
    ↓
Application/Service
    ↓
Domain Interfaces
    ↓
Repository / Infrastructure
```

Example:

```text
ChatController
      ↓
ChatService
      ↓
AiProviderService
      ↓
AiProviderAdapter
      ↓
OpenAI / Anthropic / Gemini
```

Database access should not be scattered throughout controllers.

---

# 49. Environment Variables

Create `.env.example`:

```env
NODE_ENV=development
PORT=5000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/echogpt

JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

PROVIDER_ENCRYPTION_KEY=change_me

REDIS_URL=redis://localhost:6379

CORS_ORIGINS=http://localhost:3000

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GEMINI_API_KEY=

LOG_LEVEL=debug
```

Never commit the actual `.env`.

---

# 50. Docker Setup

Recommended services:

```text
api
postgres
redis
```

Example architecture:

```text
docker-compose.yml

services:
  api
  postgres
  redis
```

Production AI provider credentials should be supplied through secure environment/secret management, not committed files.

---

# 51. Testing Strategy

## Unit Tests

Test:

- Auth service.
- Password hashing.
- JWT validation.
- Refresh token rotation.
- Subscription entitlement calculation.
- Usage limit calculation.
- Provider selection.
- Provider health logic.
- Chat service.
- Search service.

## Integration Tests

Test:

- Registration + database.
- Login + session creation.
- Refresh + rotation.
- Logout.
- Subscription changes.
- Conversation ownership.
- Provider CRUD.
- Usage tracking.

## E2E Tests

Minimum critical flows:

```text
Register
  ↓
Login
  ↓
Get Profile
  ↓
Create Conversation
  ↓
Send Prompt
  ↓
Check Usage
  ↓
Logout
```

Admin:

```text
Admin Login
  ↓
Dashboard
  ↓
Users
  ↓
Providers
  ↓
Analytics
```

---

# 52. Security Test Cases

Test explicitly:

- Invalid JWT.
- Expired JWT.
- Revoked refresh token.
- Refresh token reuse.
- Brute-force login.
- IDOR / broken object-level authorization.
- User accessing another user's conversation.
- User accessing another user's search history.
- User accessing admin endpoint.
- Admin provider API key exposure.
- SQL injection.
- XSS through stored chat content.
- Oversized payload.
- Malicious URL.
- SSRF attempts.
- Rate-limit bypass.
- Concurrent usage-limit requests.
- CORS misconfiguration.
- Sensitive information in logs.

---

# 53. Important Ownership Checks

Every user-owned resource must verify:

```text
resource.userId === authenticatedUser.id
```

Do not trust IDs from the frontend.

Example:

```text
GET /chats/:id
```

must not simply query:

```text
findUnique({ id })
```

without verifying ownership.

Use an ownership-aware query or explicit authorization service.

---

# 54. Concurrency & Race Conditions

The most important concurrency cases:

## Usage Limit

Two simultaneous requests must not both consume the final available quota.

Use:

- Atomic DB update.
- Transaction with proper isolation where needed.
- Or Redis atomic counter.

## Default Provider

Setting provider A as default while provider B is default must never result in two active defaults.

Use transaction + database-level uniqueness strategy where practical.

## Subscription Period

Two concurrent requests around period rollover must calculate the same correct period.

## Refresh Token Rotation

Old refresh token must become invalid immediately after rotation.

---

# 55. Idempotency

For operations that can be retried by clients:

```text
POST /chats/:conversationId/messages
POST /subscriptions/upgrade
```

Support an optional:

```text
Idempotency-Key
```

header.

Recommended table if implementing full idempotency:

```text
idempotency_keys
- id
- userId
- key
- requestHash
- responseStatus
- responseBody
- expiresAt
```

For the internship assignment, this can be implemented for chat requests or documented as a production enhancement.

---

# 56. Logging Strategy

Use structured logs.

Example:

```json
{
  "level": "info",
  "requestId": "req_123",
  "method": "POST",
  "path": "/api/v1/chats/123/messages",
  "statusCode": 200,
  "latencyMs": 850
}
```

Never log:

```text
password
access token
refresh token
API key
authorization header
full sensitive prompt
```

---

# 57. Audit Logging

Audit important actions:

```text
USER_CREATED
USER_DELETED
PASSWORD_CHANGED
ROLE_CHANGED
USER_SUSPENDED
SUBSCRIPTION_CHANGED
PROVIDER_CREATED
PROVIDER_UPDATED
PROVIDER_DELETED
PROVIDER_ENABLED
PROVIDER_DISABLED
DEFAULT_PROVIDER_CHANGED
```

Audit logs should be append-oriented.

---

# 58. Error Handling Architecture

Use a global exception filter.

Map internal exceptions to safe public errors.

Example:

```text
Prisma unique constraint
        ↓
DUPLICATE_RESOURCE
```

```text
Provider timeout
        ↓
PROVIDER_TIMEOUT
```

```text
Unexpected exception
        ↓
INTERNAL_SERVER_ERROR
```

Never expose:

```text
Prisma stack trace
database hostname
provider secret
internal file path
```

---

# 59. API Versioning

Use:

```text
/api/v1
```

If breaking changes are introduced:

```text
/api/v2
```

Do not silently break the Chrome extension contract.

---

# 60. Database Migration Strategy

Commands:

```bash
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

Production:

```bash
npx prisma migrate deploy
```

Migration files must be committed to Git.

Never manually change production schema without a migration.

---

# 61. Seed Data

Seed:

### Roles

```text
USER
ADMIN
```

### Plans

```text
FREE
PREMIUM
```

### Optional

A development admin account controlled through environment variables.

Never hard-code a real production password.

---

# 62. README Requirements

README must contain:

1. Project overview.
2. Architecture.
3. Features.
4. Tech stack.
5. Prerequisites.
6. Environment setup.
7. Docker setup.
8. Database migration.
9. Seed instructions.
10. Development command.
11. Production build.
12. Swagger URL.
13. Authentication flow.
14. API endpoint overview.
15. Testing.
16. Security notes.
17. Project structure.
18. Future improvements.

Example:

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

Swagger:

```text
http://localhost:5000/docs
```

---

# 63. Git Commit Strategy

The evaluation explicitly mentions Git commit history, so avoid one giant commit.

Recommended commits:

```text
chore: initialize nestjs project
chore: configure prisma and postgres
feat: add global validation and exception handling
feat: implement authentication module
feat: implement refresh token rotation
feat: implement user profile management
feat: implement roles and authorization
feat: implement subscription module
feat: add usage limit enforcement
feat: implement ai provider abstraction
feat: add openai provider adapter
feat: add anthropic provider adapter
feat: add gemini provider adapter
feat: implement chat module
feat: implement web search module
feat: implement admin user management
feat: implement admin analytics
feat: add swagger documentation
security: encrypt ai provider credentials
test: add authentication e2e tests
test: add chat and usage tests
chore: add docker compose
docs: add setup and api documentation
```

Commit messages should represent actual completed work.

---

# 64. Implementation Order

## Sprint 1 — Foundation

- NestJS setup.
- Config.
- Prisma.
- PostgreSQL.
- Docker.
- Swagger.
- Validation.
- Error handling.
- Logging.
- Health endpoint.

## Sprint 2 — Authentication

- User model.
- Role model.
- Registration.
- Login.
- JWT.
- Refresh token.
- Session.
- Logout.
- Logout all.
- Password hashing.

## Sprint 3 — User & Subscription

- Profile.
- Password change.
- Account deletion.
- Subscription plans.
- Subscription.
- Usage calculation.
- Upgrade/downgrade.

## Sprint 4 — AI Providers

- Provider abstraction.
- Provider CRUD.
- Encryption.
- Enable/disable.
- Default provider.
- Health check.
- OpenAI adapter.
- Gemini adapter.
- Anthropic adapter.

## Sprint 5 — Chat

- Conversation.
- Message.
- Send prompt.
- History.
- Provider selection.
- Usage logging.
- Error handling.
- Ownership checks.

## Sprint 6 — Search

- Search abstraction.
- Search endpoint.
- History.
- Recent searches.
- Suggestions.
- Usage limits.
- Optional Redis caching.

## Sprint 7 — Admin

- Dashboard.
- Users.
- Subscriptions.
- Providers.
- Usage analytics.
- Request logs.
- System health.

## Sprint 8 — Quality

- Swagger completion.
- E2E tests.
- Security testing.
- Docker.
- README.
- Postman collection.
- Git cleanup.
- Final review.

---

# 65. Definition of Done

A feature is considered complete only when:

- Controller exists.
- DTO validation exists.
- Authentication/authorization is correct.
- Business logic is in service layer.
- Database access is separated appropriately.
- Edge cases are handled.
- Correct HTTP status codes are returned.
- Swagger documentation exists.
- Errors follow the standard response.
- Sensitive data is protected.
- Unit/integration tests exist where practical.
- Logs do not expose secrets.
- Git commit represents the completed feature.

---

# 66. Final Acceptance Checklist

## Architecture

- [ ] Modular NestJS architecture.
- [ ] Clear service boundaries.
- [ ] Provider abstraction.
- [ ] Repository/data-access separation where useful.
- [ ] No business logic in controllers.

## Authentication

- [ ] Registration.
- [ ] Login.
- [ ] Access JWT.
- [ ] Refresh token.
- [ ] Refresh rotation.
- [ ] Session revocation.
- [ ] Logout.
- [ ] Logout all.
- [ ] Password hashing.
- [ ] Rate limiting.
- [ ] Email verification bonus.

## User

- [ ] Profile.
- [ ] Update profile.
- [ ] Change password.
- [ ] Delete account.
- [ ] Role authorization.

## Subscription

- [ ] Free plan.
- [ ] Premium plan.
- [ ] Status.
- [ ] Upgrade.
- [ ] Downgrade.
- [ ] Usage limits.
- [ ] Remaining requests.
- [ ] Atomic usage accounting.

## AI Providers

- [ ] OpenAI.
- [ ] Anthropic.
- [ ] Gemini.
- [ ] CRUD.
- [ ] Enable/disable.
- [ ] Default provider.
- [ ] Encrypted keys.
- [ ] Masked API keys.
- [ ] Health check.
- [ ] Timeout handling.

## Chat

- [ ] Conversations.
- [ ] Messages.
- [ ] Provider selection.
- [ ] Conversation history.
- [ ] Usage tracking.
- [ ] Error handling.
- [ ] Ownership checks.
- [ ] Streaming bonus.

## Search

- [ ] Search query.
- [ ] Search history.
- [ ] Recent searches.
- [ ] Suggestions.
- [ ] Usage tracking.
- [ ] Caching bonus.
- [ ] SSRF protection.

## Admin

- [ ] Dashboard.
- [ ] User management.
- [ ] Subscription management.
- [ ] Provider management.
- [ ] Analytics.
- [ ] Request logs.
- [ ] System health.

## API

- [ ] `/api/v1`.
- [ ] Consistent responses.
- [ ] Consistent errors.
- [ ] Pagination.
- [ ] Request IDs.
- [ ] Swagger.
- [ ] Authentication documentation.
- [ ] Error documentation.

## Security

- [ ] Argon2id.
- [ ] JWT secrets outside Git.
- [ ] Refresh token hashing.
- [ ] Provider API-key encryption.
- [ ] Helmet.
- [ ] CORS.
- [ ] Rate limiting.
- [ ] Input validation.
- [ ] IDOR protection.
- [ ] SQL injection protection through Prisma.
- [ ] SSRF protection.
- [ ] Sensitive-log protection.

## DevOps

- [ ] Dockerfile.
- [ ] docker-compose.
- [ ] `.env.example`.
- [ ] Prisma migrations.
- [ ] Seed script.
- [ ] CI tests.
- [ ] README.
- [ ] Postman collection.

---

# 67. Recommended Production Enhancements

These are not required for the minimum assignment but make the design more production-oriented:

1. Redis for rate limiting and caching.
2. BullMQ for asynchronous jobs.
3. Email service for verification/password recovery.
4. Payment integration such as Stripe for real subscriptions.
5. Centralized observability.
6. OpenTelemetry.
7. Prometheus metrics.
8. Sentry or equivalent error monitoring.
9. Background provider health checks.
10. Database connection pooling.
11. Idempotency keys.
12. API response compression.
13. Automated security scanning.
14. GitHub Actions CI/CD.
15. Secret management through deployment infrastructure.
16. Automated database backup strategy.
17. Soft-delete/anonymization policy.
18. SSE streaming for chat.
19. Provider fallback strategy.
20. Circuit breaker for repeatedly failing providers.

---

# 68. Provider Fallback Strategy

For production resilience:

```text
Selected Provider
       ↓
Health check
       ↓
Available?
   /        \
 Yes         No
 ↓           ↓
Call      Fallback Provider
             ↓
          Call provider
```

Fallback must respect:

- User subscription entitlement.
- Provider availability.
- Model compatibility.
- Usage accounting.
- Maximum retry count.

Never retry indefinitely.

---

# 69. AI Provider Timeout & Retry Policy

Suggested policy:

```text
Timeout: 30–60 seconds
Retries: 1–2 maximum
Backoff: exponential
```

Do not retry:

- Invalid API key.
- Invalid request.
- Unsupported model.
- User input validation errors.

Potentially retry:

- Temporary network errors.
- Provider 5xx.
- Temporary rate-limit responses, subject to provider guidance.

---

# 70. Data Privacy

The backend handles potentially sensitive:

- Chat prompts.
- AI responses.
- Search history.
- User identity.
- Provider configuration.

Therefore:

- Use HTTPS in production.
- Minimize stored data.
- Restrict admin access.
- Do not expose private user data in analytics.
- Avoid logging full prompts by default.
- Define data retention rules.
- Support account deletion/anonymization.
- Document what is stored and why.

---

# 71. Final Architecture

```text
                         Chrome Extension
                                |
                              HTTPS
                                |
                         API Gateway / NestJS
                                |
       +------------------------+------------------------+
       |                        |                        |
   Auth Module             User Module             Admin Module
       |                        |                        |
       +------------------------+------------------------+
                                |
                         Business Services
                                |
        +-----------------------+-----------------------+
        |                       |                       |
   Subscription            Chat Service           Search Service
        |                       |                       |
   Usage Service          AI Provider Service     Search Adapter
                                |
                  +-------------+-------------+
                  |             |             |
               OpenAI       Anthropic      Gemini
                                |
                         PostgreSQL
                                |
                         Redis (optional)
```

---

# 72. Submission Package

Final GitHub repository should contain:

```text
echogpt-backend/
├── src/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── test/
├── docs/
├── postman/
│   └── echogpt.postman_collection.json
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

---

# 73. Final Submission Quality Target

The project should demonstrate that the candidate understands more than simply creating CRUD endpoints.

The implementation should clearly demonstrate:

```text
Authentication
+
Authorization
+
Relational Database Design
+
REST API Design
+
AI Provider Abstraction
+
Subscription Entitlements
+
Usage Enforcement
+
Security
+
Error Handling
+
Observability
+
Swagger
+
Testing
+
Docker
+
Maintainable Architecture
```

The most important implementation priorities for the assignment are:

1. Correct authentication and authorization.
2. Secure refresh-token/session handling.
3. Correct PostgreSQL relational design.
4. Provider abstraction instead of provider-specific code scattered throughout the application.
5. Atomic subscription usage enforcement.
6. Strong resource ownership checks.
7. Secure API-key handling.
8. Consistent REST API/error design.
9. Complete Swagger documentation.
10. Clean Git history and README.

This document is the implementation blueprint. Individual implementation details may be adjusted when an actual provider API, payment system, or Chrome Extension contract imposes additional constraints.
