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

PHASE 01 — FOUNDATION / PHASE 04 — TEAMS & RBAC

## Current Module

TEAMS & RBAC FOUNDATION (AUDIT LOGGING & TEAMS COMPLETE)

## Current Task

Phase 4 Teams & RBAC Foundation implemented and verified.

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
- `GET /api/v1/audit-logs` (`audit_logs.read` - tenant-isolated audit log viewer)
- `POST /api/v1/teams` (`teams.manage` - `RolesGuard` `@Roles(CUSTOMER_ADMIN, SUPER_ADMIN)`)
- `GET /api/v1/teams` (tenant-isolated list of teams)
- `GET /api/v1/teams/:id` (team details by ID)
- `POST /api/v1/teams/:id/members` (`teams.manage` - add member to team)
- `DELETE /api/v1/teams/:id/members/:userId` (`teams.manage` - remove member from team)
- `GET /api/v1/super-admin/mfa-test` (`JwtAuthGuard` + `SuperAdminMfaGuard`)

### Implemented Multi-Factor Authentication (MFA / 2FA) & Role-Based Access Control (RBAC)
- **Source of Truth**: Supabase Auth MFA is the authoritative source of truth for MFA enrollment and verification.
- **Factor Type**: TOTP (Time-based One-Time Password) is the selected second factor.
- **JWT Assurance Level**: Supabase JWT `aal2` claim represents successful second-factor authentication.
- **Backend Guards**:
  - `SuperAdminMfaGuard`: Enforces `aal2` for `SUPER_ADMIN` routes while permitting non-Super Admin roles (`CUSTOMER_ADMIN`, `MANAGER`, `AGENT`) without MFA.
  - `RolesGuard`: Enforces tenant-isolated declarative `@Roles(...)` metadata. Evaluates target `organizationId` from request query, params, or header, and supports global `SUPER_ADMIN` bypass.
- **Audit Logging**: `AuditLogsService` logs append-only, tenant-isolated audit events with metadata field sanitization (redacting passwords, tokens, secrets).
- **Teams Management**: `TeamsService` and `TeamsController` provide full lifecycle management for teams and team members within an organization, firing audit events (`team.created`, `team.member_added`, `team.member_removed`).


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