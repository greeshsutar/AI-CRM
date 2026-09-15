# MINSTOCS CRM

# PHASE 2 — AUTHENTICATION AND IDENTITY SPECIFICATION

Version: 1.0

Status: AUTHORITATIVE

Product: MINSTOCS CRM

Architecture: Modular Monolith

Phase: 2

Previous Phase: Phase 1 — Production Project Foundation

---

# 1. PURPOSE

This document defines the complete technical scope for:

PHASE 2 — AUTHENTICATION AND IDENTITY

Phase 2 introduces production authentication and application identity.

All implementation during Phase 2 MUST follow:

1. `docs/00-MASTER-SPEC.md`
2. This document
3. `docs/02-ARCHITECTURE.md`
4. `docs/03-TECH-STACK.md`
5. `docs/04-PROJECT-STRUCTURE.md`
6. `docs/05-DATABASE-SPEC.md`
7. `docs/06-API-SPEC.md`
8. `docs/07-SECURITY-SPEC.md`
9. `docs/08-FRONTEND-SPEC.md`
10. `docs/09-TESTING-SPEC.md`
11. `docs/10-DEVOPS-SPEC.md`
12. `docs/11-DEVELOPMENT-RULES.md`

If any conflict exists:

STOP.

Do not silently choose an interpretation.

Report the conflict and resolve it before implementation.

---

# 2. PHASE 2 OBJECTIVE

Phase 2 establishes the production authentication and identity foundation for MINSTOCS CRM.

Phase 2 MUST provide:

- User signup
- User login
- User logout
- Session management
- Access-token handling
- Access-token validation
- Current authenticated-user retrieval
- Password reset
- Email verification
- Authentication guards
- Authentication-aware frontend state
- Application User persistence
- Secure relationship between Supabase Auth identity and application identity

Phase 2 MUST NOT implement CRM business functionality.

The following are explicitly OUT OF SCOPE for Phase 2:

- Organizations
- Organization membership
- Teams
- Team membership
- CRM contacts
- Companies
- Leads
- Pipelines
- Deals
- Activities
- Tasks
- Campaigns
- Agents
- Telephony
- Call recordings
- Messaging
- Conversations
- Automation
- Notifications
- Reports
- Analytics
- AI CRM
- Billing
- Integrations
- Webhooks
- Full application RBAC
- CRM permissions

Those capabilities belong to later approved phases.

---

# 3. AUTHENTICATION ARCHITECTURE

## 3.1 Authentication Provider

MINSTOCS CRM SHALL use:

SUPABASE AUTH

as the authentication identity provider.

Custom password authentication MUST NOT be implemented inside NestJS.

The application MUST NOT maintain its own password hashing system.

The application MUST NOT store user passwords.

Supabase Auth is responsible for:

- Credential authentication
- Password management
- Email verification
- Authentication sessions
- Access tokens
- Refresh tokens
- Password reset flows
- OAuth identity integration when explicitly enabled

---

## 3.2 Authentication Ownership

Supabase Auth owns authentication.

NestJS owns application-level identity and authorization enforcement.

The separation is:

Supabase Auth
    ↓
Authentication identity
    ↓
JWT
    ↓
NestJS authentication guard
    ↓
Application User
    ↓
Application authorization

The backend MUST NOT authenticate passwords directly.

---

# 4. APPLICATION AUTHENTICATION FLOW

The standard authentication flow is:

Browser
    ↓
Next.js
    ↓
Supabase Auth client
    ↓
Supabase Auth
    ↓
Authenticated session
    ↓
Supabase access token
    ↓
NestJS API
    ↓
JWT verification
    ↓
Authenticated Supabase user ID
    ↓
Application User lookup/synchronization
    ↓
Protected application operation

The frontend MUST NOT bypass NestJS for protected application operations.

Supabase Auth establishes authentication identity.

NestJS establishes application identity and enforces backend authorization.

---

# 5. IDENTITY MODEL

Supabase Auth owns the authentication identity.

The Supabase Auth user UUID is the canonical authentication identifier.

The application maintains a corresponding application-level `User` record.

Conceptually:

Supabase `auth.users`
        ↓
Application `User`

The application `User.id` MUST equal the Supabase Auth user UUID.

No second independent authentication identity may be created.

The application MUST NOT generate a separate UUID for the same authenticated user.

---

## 5.1 Identity Mapping

The identity mapping is:

Supabase Auth user:

`auth.users.id`

maps directly to:

Application User:

`public.users.id`

Both MUST represent the same UUID.

The backend MUST use the authenticated JWT `sub` claim as the canonical Supabase user ID.

The backend MUST NOT trust a client-supplied user ID for authenticated-user identity.

---

# 6. USER DATABASE MODEL

Phase 2 introduces the application User model.

The authoritative Prisma model SHALL be:

```prisma
model User {
  id        String   @id @db.Uuid
  email     String   @unique
  firstName String?
  lastName  String?
  avatarUrl String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```