# MINSTOCS CRM — AI Development Context

## 1. Purpose

This file provides stable project context for AI-assisted development.

It is NOT the product specification and it is NOT a replacement for the V8 Master Specification.

The V8 Master Specification is the authoritative source for product requirements, business rules, API inventory, roles, permissions, workflows, and module behavior.

This file exists to prevent unnecessary repository-wide inspection and repeated rediscovery of stable project information.

---

# 2. Product

MINSTOCS is a production-grade, multi-tenant Telecalling CRM and sales-operations SaaS.

It is NOT a simple CRUD CRM.

The system includes:

- Multi-tenant organizations
- Role-based access control
- Contacts and leads
- Campaigns
- Pipeline/deals
- Agent operations
- AI lead scoring
- Smart assignment
- Telephony
- Messaging
- Follow-ups
- Workflows
- Timeline/activity history
- Analytics
- ROI
- Administration
- Integrations
- Billing
- Auditability

The system must be designed for production use.

---

# 3. Authoritative Specification

Primary source of truth:

V8 Master Specification / Telecalling CRM Master Specification V8 Final Complete.

Rules:

1. Follow the specification.
2. Do not invent product requirements.
3. Do not invent API endpoints.
4. Do not remove requirements simply to make implementation easier.
5. Do not silently change business rules.
6. If the specification is ambiguous, STOP and report the ambiguity.
7. Do not use assumptions as replacements for missing requirements.

The API inventory in the specification is a planning/contract reference. It does not authorize implementing unrelated APIs outside the current task.

---

# 4. Current Architecture

## Backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Supabase
- REST API

Backend application:

apps/api

API base:

/api/v1

Swagger:

/api/docs

Development API:

http://localhost:3001

---

# 5. Frontend

Frontend:

apps/web

Technology:

- Next.js
- TypeScript
- Supabase client

IMPORTANT:

Frontend implementation is currently postponed.

The UI/UX designer is still completing the Figma design.

Do NOT implement frontend features unless explicitly requested.

Do NOT modify frontend files for a backend-only task.

---

# 6. Architecture Style

The backend is a modular monolith.

Expected high-level modules include:

- Identity / Organization
- CRM
- Pipeline
- Campaign
- Events
- AI Scoring
- Assignment
- Agent
- Telephony
- Messaging
- Timeline
- Follow-up
- Workflow
- Analytics
- ROI
- Administration
- Integrations
- Billing
- Platform

Do not convert the system into microservices unless explicitly required by the specification or a future architectural decision.

---

# 7. Multi-Tenancy

The system is multi-tenant.

Core relationship:

User
→ Membership
→ Organization

Organization owns business data.

Membership connects a user to an organization.

Roles and permissions control access.

Tenant isolation is mandatory.

A user must never access another organization's data unless the specification explicitly permits the operation.

Organization/tenant context must come from authenticated and authorized context, not arbitrary client-provided organization IDs.

---

# 8. Roles

The system includes these primary roles:

- Super Admin
- Admin
- Manager
- Agent

IMPORTANT:

These roles are NOT interchangeable.

Do not assume that all authenticated users have the same capabilities.

Authorization must be implemented according to the specification.

Super Admin operates the SaaS/platform level.

Admin operates/configures an organization's CRM.

Manager operates the sales operation.

Agent executes assigned sales work.

Exact permissions must come from the authoritative specification.

---

# 9. Authentication

Current authentication architecture:

Supabase Auth
→ Supabase JWT
→ NestJS JwtStrategy
→ JwtAuthGuard
→ authenticated user context
→ authorization/RBAC
→ application resources

Supabase is responsible for authentication.

NestJS is responsible for validating the JWT and enforcing application authorization.

Do not replace the existing authentication architecture unless explicitly instructed.

---

# 10. Current Implemented Backend State

Known implemented foundation:

- NestJS application
- Prisma database integration
- Supabase integration
- Supabase authentication
- JWT validation
- JwtStrategy
- JwtAuthGuard
- Users module
- Current user endpoint
- User profile update endpoint
- Health endpoint

Known endpoints:

GET /api/v1/health

GET /api/v1/users/me

PATCH /api/v1/users/me

Authentication has been tested against Supabase.

Database connection has been verified.

TypeScript compilation has been verified.

Linting has been verified.

Tests/build have been verified according to the latest implementation report.

IMPORTANT:

Do not assume that Foundation/Identity is complete merely because authentication and /users/me work.

Organization, Membership, RBAC, permissions, tenant isolation, teams, audit, settings, and other Foundation requirements must be verified separately.

---

# 11. Current Development Position

Current major phase:

PHASE 04 — TEAMS & RBAC

Foundation includes the identity/organization/security foundation required by the rest of the CRM (currently complete up through Teams and RBAC).

IMPORTANT AI RULE: 
Phase 2 (Authentication) and Phase 3 are HISTORICAL AND COMPLETED.
The original `13-PHASE-2-SPEC.md` and `14-PHASE-2-IMPLEMENTATION-PLAN.md` documents have been moved to `docs/archive/`. 
DO NOT treat archived documents as active implementation instructions. Do not attempt to "re-implement" Authentication.

Expected areas include:

1. Authentication
2. Users
3. Organizations
4. Memberships
5. Roles
6. Permissions
7. RBAC enforcement
8. Teams
9. Organization/tenant context
10. Tenant isolation
11. Audit
12. Settings

Only implement the specific area assigned in the current task.

---

# 12. Development Method

Development is strictly incremental.

Required flow:

Specification
→ Module
→ Sub-module/task
→ Understand requirements
→ Identify dependencies
→ Implement
→ Automated verification
→ Postman verification
→ Debug failures
→ Confirm completion
→ Update project state
→ Next task

Do NOT skip directly from planning to large-scale implementation.

Do NOT implement multiple future modules together.

---

# 13. Task Scope Rule

Every AI implementation task must have a clearly defined scope.

For each task:

- Implement ONLY the requested task.
- Do not implement future modules.
- Do not create speculative APIs.
- Do not perform unrelated refactoring.
- Do not change architecture unnecessarily.
- Do not modify unrelated files.
- Do not add dependencies unless required.
- Do not rewrite working code without a justified reason.

If a dependency is missing:

1. Identify it.
2. Determine whether it is genuinely required.
3. Report it.
4. Do not silently expand the task scope.

---

# 14. Repository Inspection Rule

DO NOT perform a repository-wide inspection for every task.

Before implementation:

1. Read this file.
2. Read the current task specification.
3. Read the current project state file if available.
4. Inspect only files directly relevant to the current task.
5. Inspect direct dependencies only when required.

Do NOT:

- scan the entire repository
- read unrelated modules
- read the frontend for backend tasks
- reread completed modules without a dependency reason
- regenerate the entire architecture

Use dependency-based inspection.

Example:

Organization task may require:

- Prisma schema
- auth module
- users module
- database module
- relevant guards/strategies

It does NOT require reading:

- telephony
- messaging
- analytics
- billing
- frontend

unless a direct dependency exists.

---

# 15. API Rules

There are approximately 340+ APIs/routes defined by the master specification.

IMPORTANT:

The existence of an API in the specification does NOT mean it should be implemented immediately.

Never generate APIs simply because they seem useful.

For every API:

- It must belong to the current module/task.
- It must be supported by the authoritative specification.
- Its authorization requirements must be respected.
- Its validation requirements must be respected.
- Its tenant-scoping requirements must be respected.
- Its response/error behavior must be consistent with the project contract.

---

# 16. Database Rules

Use Prisma for database access.

Before changing the schema:

1. Understand existing models.
2. Check existing relations.
3. Check existing constraints.
4. Check indexes.
5. Avoid duplicate models.
6. Avoid breaking existing relationships.
7. Use migrations properly.
8. Preserve tenant isolation.

Do not create a second model representing the same business concept.

Do not change schema merely for convenience.

---

# 17. Security Rules

Security is production-critical.

Never:

- expose secrets to the frontend
- expose Supabase secret/service credentials to browser code
- bypass authentication
- bypass authorization
- trust arbitrary organization IDs from clients
- disable guards to make tests pass
- log access tokens
- commit secrets
- weaken tenant isolation

Authentication and authorization are separate concerns.

A valid JWT does NOT automatically mean the user is authorized to perform every operation.

---

# 18. Error Handling

APIs must handle at least:

- validation errors
- unauthenticated requests
- unauthorized/forbidden requests
- not found
- duplicate/conflict cases
- invalid state transitions
- tenant access violations

Do not return successful responses for failed business operations.

Do not hide errors with broad catch blocks.

---

# 19. Verification

After implementation, run the relevant checks.

At minimum when applicable:

pnpm typecheck

pnpm lint

pnpm test

pnpm build

Then test the API through Postman.

Postman testing should include:

1. Happy path
2. Missing authentication
3. Invalid/expired authentication
4. Insufficient permissions
5. Invalid input
6. Missing resource
7. Duplicate/conflict
8. Tenant isolation
9. Relevant role combinations

Do not mark a module complete merely because TypeScript compiles.

---

# 20. Postman-First Backend Verification

Backend modules must be verified independently of the frontend.

Expected workflow:

NestJS API
→ Postman
→ inspect response
→ verify database state
→ test authorization
→ test failure cases
→ debug
→ repeat

Frontend integration comes later.

---

# 21. AI Implementation Behavior

The AI coding agent must behave as an implementation engineer, not as the product architect.

The AI must:

- follow the supplied task
- follow the V8 specification
- inspect only necessary files
- preserve existing architecture
- report blockers
- report assumptions
- avoid speculative implementation
- avoid scope creep

The AI must NOT decide independently what the next module should be.

The next module/task will be explicitly provided.

---

# 22. When Information Is Missing

If required information cannot be established from:

- this context file
- the relevant specification
- the relevant existing code

then STOP.

Report:

- what is missing
- why it is required
- which decision is blocked

Do not guess.

---

# 23. Completion Rule

A task is complete only when:

- implementation matches the task
- required tests pass
- typecheck passes
- lint passes
- build passes when applicable
- Postman verification passes
- authorization is verified
- tenant isolation is verified where applicable
- no unrelated functionality was introduced
- project state is updated

Then and only then move to the next task.

---

# 24. Current Rule

Backend only.

Current major phase:

PHASE 04 — TEAMS & RBAC

Current focus:

Teams, RBAC, and Audit Logging Foundation.

Frontend implementation is intentionally postponed.

Do not start CRM, AI scoring, telephony, messaging, analytics, billing, or other future modules unless explicitly instructed.

---

# 25. Golden Rule

DO NOT BUILD RANDOMLY.

Follow:

V8 Specification
→ Current Module
→ Current Task
→ Relevant Dependencies
→ Implementation
→ Postman
→ Verification
→ Completion
→ Next Task

One controlled task at a time.