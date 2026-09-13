# MINSTOCS CRM — Current Development State

> This file records the verified implementation state of the project.
>
> It is a status document, NOT the product specification.
>
> Do not mark functionality as complete unless it has been implemented and verified.

---

# 1. Project Status

## Overall Status

IN DEVELOPMENT

## Development Strategy

BACKEND FIRST

Frontend implementation is intentionally postponed until the Figma/UI design is finalized.

## Current Major Phase

PHASE 01 — FOUNDATION

## Current Module

IDENTITY / ORGANIZATION FOUNDATION (CHUNK 1 COMPLETE)

## Current Task

Chunk 1 (Organization + Membership Foundation APIs & Database Models) implemented and verified.

### Implemented Endpoints
- `GET /api/v1/health`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `POST /api/v1/organizations` (`organizations.manage`)
- `GET /api/v1/organizations` (`organizations.read`)
- `GET /api/v1/organizations/:id` (`organizations.read`)
- `POST /api/v1/memberships` (`memberships.manage`)
- `GET /api/v1/memberships` (`memberships.read`)
- `GET /api/v1/memberships/:id` (`memberships.read`)
- `GET /api/v1/super-admin/mfa-test` (`JwtAuthGuard` + `SuperAdminMfaGuard`)

### Implemented Temporary Super Admin MFA Frontend Routes
- `/auth/mfa/setup`: Super Admin TOTP enrollment page using `supabase.auth.mfa.enroll`, displaying QR code and handling initial code verification.
- `/auth/mfa/verify`: Super Admin TOTP challenge page using `supabase.auth.mfa.challenge` and `supabase.auth.mfa.verify`.
- `/auth/mfa/test`: Temporary end-to-end test page for testing `GET /api/v1/super-admin/mfa-test` with current JWT assurance level (`aal1` vs `aal2`).

### Multi-Factor Authentication (MFA / 2FA) State
- **Source of Truth**: Supabase Auth MFA is the authoritative source of truth for MFA enrollment and verification.
- **Factor Type**: TOTP (Time-based One-Time Password) is the selected second factor.
- **JWT Assurance Level**: Supabase JWT `aal2` claim represents successful second-factor authentication.
- **Backend Guard**: `SuperAdminMfaGuard` is implemented in NestJS to enforce `aal2` for `SUPER_ADMIN` routes while permitting non-Super Admin roles (`CUSTOMER_ADMIN`, `MANAGER`, `AGENT`) without MFA.
- **No Secret Storage**: No TOTP secrets, recovery codes, or QR codes are stored in the PostgreSQL database.
- **Frontend Status**: Temporary functional MFA enrollment, challenge, and verification routes implemented in `apps/web`. Final Figma design UI will be applied when designs are delivered.


---

# 2. Technology Stack

## Monorepo

- pnpm workspace

## Backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Supabase
- REST API

## Frontend

- Next.js
- TypeScript
- Supabase client

---

# 3. Application Structure

```text
apps/
├── api/
│   └── NestJS backend
│
└── web/
    └── Next.js frontend

packages/
└── shared packages as implemented