# EchoGPT Backend REST API

Production-ready REST API backend for the EchoGPT Chrome Extension, built with NestJS, PostgreSQL, Prisma, JWT authentication, and Swagger/OpenAPI.

## Problem Statement

EchoGPT requires a secure and maintainable backend to support an AI assistant Chrome Extension. The backend needs to handle authentication and sessions, user management, subscriptions and usage limits, multiple AI providers, conversations, AI-assisted web search, administration, analytics, logging, and API documentation.

The system is designed to support additional AI providers, subscription plans, usage rules, and features without requiring major changes to the core architecture.

## Solution Overview

EchoGPT Backend follows a modular, feature-based NestJS architecture with clean separation between HTTP controllers, business services, and data-access logic.

The API provides:

- Secure JWT-based authentication with short-lived access tokens and refresh-token rotation.
- User profile and account management.
- `USER` and `ADMIN` role-based authorization.
- Free and Premium subscription plans with centralized usage/entitlement enforcement.
- Flexible AI provider abstraction for OpenAI, Anthropic Claude, and Google Gemini.
- Encrypted storage of AI provider API keys.
- Conversation and message management.
- AI-assisted web search with search history and recent searches.
- Admin dashboard, user management, subscription management, provider management, usage analytics, request logs, and system health.
- Consistent REST API response and error structures.
- Swagger/OpenAPI documentation.
- PostgreSQL relational database with Prisma ORM.
- Docker/Docker Compose support for local development and deployment-oriented workflows.

### API Versioning

All public APIs are exposed under:

```text
/api/v1
```

Swagger documentation:

```text
/docs
```

> The exact Swagger URL should match the route configured in the application.

## Tech Stack

| Area               | Technology                          |
| ------------------ | ----------------------------------- |
| Runtime            | Node.js                             |
| Framework          | NestJS                              |
| Language           | TypeScript                          |
| Database           | PostgreSQL                          |
| ORM                | Prisma                              |
| Authentication     | JWT                                 |
| Password Hashing   | Argon2id                            |
| API Documentation  | Swagger / OpenAPI                   |
| Validation         | class-validator + class-transformer |
| Configuration      | @nestjs/config                      |
| HTTP Client        | Axios / NestJS HttpModule           |
| Testing            | Jest + Supertest                    |
| Containerization   | Docker + Docker Compose             |
| Security           | CORS, throttling                    |
| API Key Encryption | AES-256-GCM                         |
| API Client         | Postman                             |

## Key Features

### 1. Authentication

- User registration
- User login
- JWT access tokens
- Refresh-token support
- Refresh-token rotation
- Secure logout
- Logout from all devices
- Password hashing
- Session management
- Email verification support

Authentication endpoints:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all
POST /api/v1/auth/verify-email
POST /api/v1/auth/resend-verification
```

Access tokens are short-lived and refresh tokens are managed through persistent sessions.

### 2. User Management

```text
GET    /api/v1/users/me
PATCH  /api/v1/users/me
PATCH  /api/v1/users/me/password
DELETE /api/v1/users/me
```

Includes:

- Profile retrieval and updates
- Password change
- Account deletion
- Session revocation
- Account ownership protection
- Soft-delete/anonymization considerations

### 3. Role-Based Authorization

Supported roles:

```text
USER
ADMIN
```

Protected admin resources require JWT authentication and the `ADMIN` role.

### 4. Subscription Management

Supported plans:

```text
FREE
PREMIUM
```

Endpoints:

```text
GET  /api/v1/subscriptions/me
GET  /api/v1/subscriptions/usage
POST /api/v1/subscriptions/upgrade
POST /api/v1/subscriptions/downgrade
```

Subscription functionality includes:

- Plan management
- Subscription status
- Chat usage limits
- Search usage limits
- Remaining request calculation
- Subscription period tracking
- Subscription history
- Centralized entitlement/usage enforcement

Subscription limits are designed to be configurable rather than hard-coded inside controllers.

### 5. AI Provider Management

Supported providers:

```text
OPENAI
ANTHROPIC / CLAUDE
GOOGLE_GEMINI
```

The provider layer uses an adapter-based abstraction so new providers can be added without coupling provider-specific logic to the chat module.

Conceptually:

```text
AiProviderService
    |
    +-- OpenAiAdapter
    +-- AnthropicAdapter
    +-- GeminiAdapter
```

Provider management includes:

- Add provider
- Edit provider
- Delete provider
- Enable/disable provider
- Select default provider
- Store encrypted API keys
- Provider health checks
- Default model configuration
- Provider health status tracking

Admin endpoints:

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

Raw provider API keys are never returned to clients or exposed in logs.

### 6. Chat API

Conversation endpoints:

```text
POST   /api/v1/chats
GET    /api/v1/chats
GET    /api/v1/chats/:conversationId
PATCH  /api/v1/chats/:conversationId
DELETE /api/v1/chats/:conversationId
```

Send a prompt:

```text
POST /api/v1/chats/:conversationId/messages
```

Example request:

```json
{
  "prompt": "Explain dependency injection in NestJS.",
  "providerId": "optional-provider-id",
  "model": "optional-model"
}
```

The chat flow performs:

```text
Request
  ↓
JWT Authentication
  ↓
Conversation Ownership Check
  ↓
Subscription Entitlement Check
  ↓
Usage Limit Check
  ↓
Provider Resolution
  ↓
Provider Availability Check
  ↓
Conversation History
  ↓
AI Provider Adapter
  ↓
Persist User Message
  ↓
Persist Assistant Response
  ↓
Create Usage Log
  ↓
Return Response
```

The architecture also supports streaming responses as a bonus capability.

### 7. AI-Assisted Web Search

Search endpoint:

```text
POST /api/v1/search
```

History and suggestions:

```text
GET /api/v1/search/history
GET /api/v1/search/recent
GET /api/v1/search/suggestions
```

Features include:

- Search query validation
- Subscription-based usage limits
- Result count limits
- Search history
- Recent searches
- Search suggestions
- Search provider abstraction
- Provider timeout handling
- Search result caching support

### 8. Admin APIs

Admin endpoints cover:

- Dashboard statistics
- User management
- Subscription management
- AI provider management
- Usage analytics
- Request logs
- System health

Examples:

```text
GET /api/v1/admin/dashboard

GET /api/v1/admin/users
GET /api/v1/admin/users/:id
PATCH /api/v1/admin/users/:id
PATCH /api/v1/admin/users/:id/role
PATCH /api/v1/admin/users/:id/status

GET   /api/v1/admin/subscriptions
GET   /api/v1/admin/subscriptions/:id
PATCH /api/v1/admin/subscriptions/:id
POST  /api/v1/admin/subscriptions/:userId/activate
POST  /api/v1/admin/subscriptions/:userId/cancel

GET /api/v1/admin/analytics/usage
GET /api/v1/admin/analytics/providers
GET /api/v1/admin/analytics/daily

GET /api/v1/admin/logs/requests

GET /api/v1/admin/system/health
```

### 9. Health Check

Public health endpoint:

```text
GET /api/v1/health
```

Detailed admin health endpoint:

```text
GET /api/v1/admin/system/health
```

The health system can monitor the application, PostgreSQL, Redis when enabled, AI providers, and queues when enabled.

## Database Design

The backend uses PostgreSQL with Prisma ORM and UUID primary keys.

Core entities include:

```text
Users
Roles
Sessions
Subscriptions
Subscription Plans
Subscription History
User Usage Counters
AI Providers
Conversations
Messages
Web Searches
Search Caches
API Usage Logs
Audit Logs
Email Verification Tokens
Password Reset Tokens
```

### Main Relationships

```text
User
 ├── Role
 ├── Sessions
 ├── Subscription
 ├── Usage Counter
 ├── Conversations
 │    └── Messages
 ├── Web Searches
 ├── API Usage Logs
 └── Audit Logs

AI Provider
 ├── Conversations
 └── API Usage Logs

Subscription Plan
 └── Subscriptions
```

Database migrations are stored under:

```text
prisma/migrations/
```

## API / Architecture

The project follows a modular Clean Architecture / feature-based NestJS architecture.

```text
Chrome Extension
       |
      HTTPS
       |
NestJS API / API Gateway
       |
       +-------------------+-------------------+
       |                   |                   |
   Auth Module        User Module        Admin Module
       |                   |                   |
       +-------------------+-------------------+
                           |
                    Business Services
                           |
       +-------------------+-------------------+
       |                   |                   |
 Subscription          Chat Service       Search Service
       |                   |                   |
 Usage Service      AI Provider Service   Search Adapter
                           |
                 +---------+---------+
                 |         |         |
              OpenAI   Anthropic   Gemini
                           |
                      PostgreSQL
                           |
                    Redis (optional)
```

### Architectural Principles

- Separation of concerns
- Provider abstraction
- Resource ownership checks
- Centralized subscription/usage enforcement
- Secure credential handling
- Consistent RESTful API design
- API versioning
- Strong request validation
- Structured error handling
- Auditable operations
- Request correlation
- Safe external-provider failure handling

## API Response Format

Successful responses follow a consistent structure:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Paginated responses:

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

Error responses:

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

## Security

Security considerations include:

- Argon2id password hashing
- Short-lived JWT access tokens
- Refresh-token rotation
- Refresh-token session revocation
- Refresh-token reuse detection
- Role-based authorization
- Global request validation
- Rate limiting
- CORS configuration
- Security headers
- Encrypted provider API keys using AES-256-GCM
- No raw API keys in responses or logs
- No passwords or tokens in logs
- Request correlation with `X-Request-ID`
- Resource ownership validation
- Safe external provider error handling
- No production stack traces in API responses

Provider API keys follow this flow:

```text
Encrypted API Key in PostgreSQL
          ↓
Provider Service
          ↓
Decrypt at runtime
          ↓
Call AI Provider
          ↓
Never expose key outside backend
```

## Setup Instructions

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- PostgreSQL, or Docker/Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd echogpt-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

On Windows PowerShell, you can create/copy the file manually if `cp` is unavailable.

Then configure the required values in `.env`.

### 4. Start PostgreSQL

If the project includes Docker Compose:

```bash
docker compose up -d
```

Verify that the database container is running:

```bash
docker compose ps
```

### 5. Run Prisma Migrations

```bash
npx prisma migrate deploy
```

Generate the Prisma client:

```bash
npx prisma generate
```

If the project uses a development database and you need to create a new migration:

```bash
npx prisma migrate dev
```

### 6. Start the Application

Development:

```bash
npm run start:dev
```

Production build:

```bash
npm run build
npm run start:prod
```

The API will be available at:

```text
http://localhost:3000
```

### 7. Swagger Documentation

Open:

```text
http://localhost:3000/docs
```

If a different Swagger route is configured in the application, use that configured route.

### 8. Health Check

```text
GET http://localhost:3000/api/v1/health
```

## Environment Variables

Create `.env` from `.env.example`.

Example:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

JWT_ACCESS_SECRET="your-access-token-secret"
JWT_ACCESS_EXPIRES_IN="15m"

JWT_REFRESH_SECRET="your-refresh-token-secret"
JWT_REFRESH_EXPIRES_IN="7d"

PROVIDER_ENCRYPTION_KEY="your-provider-encryption-key"
```

### Environment Variable Description

| Variable                  | Description                                         |
| ------------------------- | --------------------------------------------------- |
| `NODE_ENV`                | Application environment                             |
| `PORT`                    | API server port                                     |
| `DATABASE_URL`            | PostgreSQL connection string                        |
| `JWT_ACCESS_SECRET`       | Secret used to sign access tokens                   |
| `JWT_ACCESS_EXPIRES_IN`   | Access-token lifetime                               |
| `JWT_REFRESH_SECRET`      | Secret used for refresh-token authentication        |
| `JWT_REFRESH_EXPIRES_IN`  | Refresh-token lifetime                              |
| `PROVIDER_ENCRYPTION_KEY` | Server-side encryption key for AI provider API keys |

Never commit the real `.env` file or production secrets to Git.

## Testing

Run unit tests:

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run end-to-end tests:

```bash
npm run test:e2e
```

Run test coverage:

```bash
npm run test:cov
```

Use the scripts that are available in the project's `package.json`.

## Project Structure

A recommended repository structure is:

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

The exact directory structure may vary slightly based on implementation details.

## Postman

A Postman collection can be included under:

```text
postman/echogpt.postman_collection.json
```

The collection can be used to test authentication, users, subscriptions, chat, search, provider management, and admin APIs.

## API Documentation

Swagger/OpenAPI documents the API endpoints, including:

- Request bodies
- Query parameters
- Path parameters
- Response schemas
- Success responses
- Error responses
- Authentication requirements
- Required roles
- Endpoint descriptions

Swagger is available through the configured `/docs` route.

## Docker

Docker Compose can be used to provide the local infrastructure required by the application.

Typical startup:

```bash
docker compose up -d
```

Stop containers:

```bash
docker compose down
```

The project may use PostgreSQL and Redis containers depending on the enabled configuration.

## Production Considerations

For production deployment:

- Use HTTPS.
- Store secrets in a secure secret-management system.
- Configure restricted CORS origins.
- Never commit API keys or database credentials.
- Use Redis-backed throttling where required.
- Monitor provider health and application health.
- Avoid logging sensitive prompts or credentials.
- Configure appropriate data retention.
- Keep database migrations under version control.
- Use structured logging and request IDs.
- Configure production database backups.
- Keep AI provider credentials exclusively on the backend.

## Assignment Submission

The repository should contain:

```text
Source Code
Database Schema
Prisma Migrations
README.md
.env.example
Docker Configuration
Swagger/OpenAPI Documentation
Tests
Postman Collection (Optional)
```

## License

This project was developed as a backend engineering assignment for the AppifyDevs Software Engineering Internship.
