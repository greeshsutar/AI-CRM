# MINSTOCS CRM

# MASTER TECHNICAL SPECIFICATION

Version: 1.1

Status: AUTHORITATIVE

Product: MINSTOCS CRM

Architecture: Modular Monolith

Development Model: Production-first

---

# 1. PURPOSE

This document defines the global technical rules, architectural principles,
development rules, verification requirements, and implementation boundaries
for MINSTOCS CRM.

It is the highest-level technical specification for the project.

All implementation work MUST follow this order of authority:

1. MASTER.md
2. Current phase specification
3. Architecture specification
4. Database specification
5. API specification
6. Security specification
7. Frontend specification
8. Testing specification
9. Development rules
10. Existing repository implementation and configuration

If two authoritative specifications conflict:

STOP the conflicting implementation.

Clearly report:

- the conflicting requirements
- the files affected
- the exact decision required

Do not silently choose an interpretation.

---

# 2. CORE DEVELOPMENT PRINCIPLES

The following principles are NON-NEGOTIABLE:

1. Correctness over speed.
2. Security over convenience.
3. Verification over assumption.
4. Existing repository state must be inspected before modification.
5. Do not invent files, APIs, dependencies, environment variables,
   database tables, credentials, or infrastructure.
6. Do not silently change architecture.
7. Do not introduce business functionality outside the approved phase.
8. Do not perform destructive operations without explicit authorization.
9. Never expose secrets in source code, logs, commits, documentation,
   screenshots, or generated output.
10. Never commit real credentials.
11. Never guess missing configuration.
12. When a required external credential is missing, identify exactly what
    is required and continue with all work that does not depend on it.
13. Do not repeatedly stop the entire implementation for a single
    externally supplied configuration value.
14. Do not create fake/mock infrastructure and present it as production
    infrastructure.
15. Every completed implementation must be verified.

---

# 3. PRODUCT

MINSTOCS CRM is a production-grade, multi-tenant SaaS CRM platform.

The long-term platform may include:

- Authentication
- Organizations
- Users
- Memberships
- Teams
- Roles
- Permissions
- Contacts
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
- Search
- Reports
- Analytics
- AI functionality
- Billing
- Integrations
- Webhooks
- Audit logging

These capabilities are developed phase-by-phase.

A capability MUST NOT be implemented before its approved phase.

---

# 4. ARCHITECTURAL PRINCIPLES

MINSTOCS CRM MUST follow:

- Modular architecture
- Strong type safety
- Backend-enforced security
- Multi-tenant isolation
- Explicit API contracts
- Database integrity
- Input validation
- Centralized error handling
- Structured logging
- Automated testing
- Observability
- Dependency discipline
- Reproducible development
- Version-controlled infrastructure
- Production-safe configuration
- Environment-based configuration
- Secret isolation
- Clear separation of development tooling and production runtime

---

# 5. APPLICATION ARCHITECTURE

The application uses a modular monolith architecture.

High-level architecture:

Frontend
    ↓
HTTP API
    ↓
NestJS Application
    ↓
Application Modules
    ↓
Data Access Layer
    ↓
PostgreSQL

Supporting infrastructure may include:

Redis
    ↓
Caching / asynchronous processing when required

Object Storage
    ↓
Supabase Storage initially

The architecture MUST remain modular so individual modules can be extracted
later if there is a demonstrated technical/business need.

Microservices MUST NOT be introduced prematurely.

---

# 6. FRONTEND

Primary technologies:

- Next.js
- React
- TypeScript

The frontend is responsible for:

- UI
- Routing
- User interaction
- Presentation
- Client-side validation
- Server-state management
- API consumption

The frontend is NOT a security boundary.

Authorization MUST ultimately be enforced by the backend.

The frontend MUST NOT directly bypass backend authorization rules.

---

# 7. BACKEND

Primary technologies:

- NestJS
- TypeScript

The backend is responsible for:

- Business rules
- API contracts
- Input validation
- Authorization
- Database access
- Tenant isolation
- Integrations
- Background processing
- Auditing
- Security
- Error handling

The backend is the primary application security boundary.

---

# 8. API STRATEGY

REST is the default API architecture.

API base path:

/api/v1

GraphQL is NOT required for Phase 1.

GraphQL may be introduced later only when a concrete requirement justifies it.

Realtime technologies may be introduced later for:

- Live call state
- Agent status
- Notifications
- Conversations
- Live dashboards

Realtime infrastructure MUST NOT be implemented in Phase 1 unless explicitly
required by an approved Phase 1 specification.

---

# 9. DATABASE

Primary database:

PostgreSQL

Initial infrastructure provider:

Supabase

ORM:

Prisma

The application MUST remain compatible with standard PostgreSQL wherever
practical.

Supabase-specific functionality MUST be isolated behind appropriate
abstractions when practical.

---

# 10. SUPABASE PROJECT

The project owner will create the actual Supabase project.

Antigravity MUST NOT create an unrelated Supabase project.

Antigravity MUST work against the specific Supabase project selected by
the project owner.

The Supabase project is identified by its project-specific configuration
and credentials.

The project owner may provide the following configuration through secure
environment variables:

- DATABASE_URL
- DIRECT_URL
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Only variables actually required by the implementation should be used.

Do NOT request or create credentials that are not required.

---

# 11. SUPABASE MCP VS APPLICATION DATABASE CONNECTION

These are separate concerns and MUST NOT be confused.

## 11.1 Supabase MCP

Supabase MCP is an engineering/development integration.

It may allow Antigravity to:

- Inspect the selected Supabase project
- Inspect schemas
- Inspect tables
- Inspect database structure
- Inspect migrations
- Verify database state
- Execute explicitly authorized database operations

Supabase MCP is NOT part of the production runtime architecture.

The application MUST NOT depend on MCP being available at runtime.

## 11.2 Application Database Connection

The NestJS/Prisma application connects to PostgreSQL using application
environment variables.

The application database connection MUST NOT depend on MCP.

Typical configuration:

DATABASE_URL=<Supabase pooled PostgreSQL connection string>

DIRECT_URL=<Supabase direct PostgreSQL connection string>

The exact connection strings MUST be obtained from the selected Supabase
project.

Antigravity MUST NOT invent these values.

---

# 12. DATABASE CREDENTIAL WORKFLOW

The required workflow is:

1. Project owner creates the Supabase project.
2. Project owner selects the intended Supabase project.
3. Project owner provides the required database connection configuration
   through secure environment configuration.
4. Antigravity verifies that the environment variables exist.
5. Antigravity verifies the connection using a safe, non-destructive
   operation.
6. Prisma configuration is validated.
7. Prisma schema is validated.
8. Migrations are created/applied only when authorized by the current phase.
9. Database state is verified after migration.
10. The connection status is reported.

IMPORTANT:

The project owner MUST NOT paste production secrets into source files.

Real secrets MUST be stored in:

- local `.env` files excluded by `.gitignore`
- deployment secret management
- CI/CD secret storage
- or another secure secret-management mechanism

`.env.example` MUST contain placeholders only.

Example:

DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

Never commit real values.

---

# 13. DATABASE CONNECTION BLOCKER POLICY

A missing database credential is a BLOCKER only for operations that actually
require a live database connection.

For example:

Database-dependent operations:

- Applying migrations
- Executing database queries
- Verifying live database state
- Running database integration tests
- Creating/verifying production database structures

Non-database-dependent operations may continue:

- Frontend implementation
- Backend module structure
- Unit tests that do not require PostgreSQL
- API contract design
- Type definitions
- Documentation
- Configuration templates
- Static analysis
- Linting
- Typechecking
- Build verification

Therefore:

DO NOT stop the entire project because the live database credentials are
temporarily unavailable.

Instead:

1. Identify the exact database-dependent operation.
2. Record the blocker.
3. Continue all independent work.
4. Return to the blocked operation once credentials are available.

Do not repeatedly ask for the same credential if it has already been provided.

---

# 14. DATABASE SAFETY

Database operations must be treated as production-sensitive.

Before executing any database operation:

1. Verify the target project.
2. Verify the target database.
3. Verify the intended operation.
4. Determine whether the operation is destructive.
5. Require explicit authorization for destructive operations.

Never:

- Drop the database
- Drop unrelated tables
- Delete production data
- Reset the database
- Run destructive migrations
- Modify unrelated schemas
- Modify unrelated tables

unless explicitly authorized.

If the target database cannot be confidently verified:

STOP the database operation and report the blocker.

Do not guess.

---

# 15. PRISMA

Prisma is the application ORM.

Authoritative Prisma schema:

apps/api/prisma/schema.prisma

There MUST be one authoritative Prisma schema unless a future architecture
specification explicitly defines otherwise.

Prisma configuration MUST be verified against the actual repository.

Do not invent Prisma models.

Do not create CRM business models before their approved phase.

---

# 16. PHASE 1 DATABASE SCOPE

Current phase:

PHASE 1 — PRODUCTION PROJECT FOUNDATION

Phase 1 establishes engineering infrastructure only.

Phase 1 MUST NOT implement CRM business functionality.

Do NOT create:

- Contacts
- Companies
- Leads
- Deals
- Pipelines
- Activities
- Tasks
- Campaigns
- CRM business tables
- CRM business relationships

unless explicitly approved by the Phase 1 specification.

Infrastructure required to support the application foundation may be created
when explicitly defined by the Phase 1 specification.

---

# 17. REDIS

Redis is optional infrastructure.

It may support:

- Caching
- Distributed coordination
- Rate limiting
- Asynchronous jobs

Redis MUST NOT become the source of truth for persistent CRM data.

Redis MUST only be implemented when required.

Do not install or configure Redis merely because it is listed in the
long-term architecture.

---

# 18. BACKGROUND PROCESSING

BullMQ may be used for asynchronous jobs.

Potential future jobs include:

- Campaign processing
- Imports
- Exports
- Notifications
- Webhook retries
- Recording processing
- AI jobs

BullMQ is NOT a Phase 1 business feature.

Do not implement BullMQ in Phase 1 unless the Phase 1 specification explicitly
requires it.

---

# 19. STORAGE

Supabase Storage is the initial object storage provider.

Large binary data such as call recordings MUST NOT be stored directly in
PostgreSQL.

Storage access should eventually be hidden behind an application-level
abstraction.

Storage infrastructure MUST NOT be implemented before its approved phase
unless required by an approved infrastructure requirement.

---

# 20. MONOREPO

The project uses:

- pnpm
- Turborepo

Before modifying workspace configuration:

1. Inspect the existing repository.
2. Verify package manager configuration.
3. Verify workspace structure.
4. Verify existing package names.
5. Avoid overwriting valid existing configuration.

Expected workspace structure may include:

apps/*
packages/*

However, the actual repository MUST always be treated as authoritative.

Never assume the repository structure without inspection.

---

# 21. DEPENDENCY DISCIPLINE

Before adding a dependency:

1. Check whether the repository already contains equivalent functionality.
2. Check whether the dependency is already installed.
3. Verify compatibility with the existing framework versions.
4. Verify the dependency is actually required.
5. Add only the minimum required dependency.

Do not add libraries simply because they are common in similar projects.

Do not replace existing libraries without justification.

---

# 22. ENVIRONMENT CONFIGURATION

Environment configuration MUST be separated by environment.

Expected files may include:

.env
.env.local
.env.development
.env.production

and:

.env.example

Real secrets MUST NOT be committed.

`.env.example` must contain variable names and safe placeholders only.

Example:

DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
API_PORT=3001
NODE_ENV=development

The exact variables MUST be verified against actual application requirements.

Do not invent environment variables that are not used.

---

# 23. SECURITY

Security is a first-class requirement.

Minimum principles:

- Backend authorization
- Input validation
- Secure secret handling
- No credential leakage
- Tenant isolation
- Least privilege
- Safe error messages
- Secure headers where applicable
- Rate limiting where required
- Auditability
- Dependency security
- Secure database access

Secrets MUST NEVER appear in:

- Git
- source code
- logs
- API responses
- screenshots
- documentation
- generated code
- test fixtures

unless explicitly using non-sensitive test placeholders.

---

# 24. ERROR HANDLING

The backend MUST provide centralized error handling.

Errors returned to clients MUST:

- Use consistent structure
- Avoid leaking internal implementation details
- Avoid leaking credentials
- Avoid leaking database connection strings
- Avoid leaking stack traces in production

Internal logs may contain additional diagnostic information when safe.

---

# 25. LOGGING

Use structured, production-appropriate logging.

Logs MUST NOT contain:

- Passwords
- API keys
- Database URLs
- Service-role keys
- Access tokens
- Refresh tokens
- Other secrets

Sensitive values must be redacted.

---

# 26. TESTING

The project must support:

- Unit tests
- Integration tests
- End-to-end tests

Potential tooling:

- Jest
- Vitest
- Playwright

Exact tooling MUST be verified against the existing repository before adding
or replacing dependencies.

Tests MUST be appropriate to the implementation.

Do not create meaningless tests solely to increase test counts.

---

# 27. VERIFICATION

Implementation is NOT complete merely because the code was written.

Appropriate verification must include:

- Unit tests
- Integration tests where applicable
- E2E tests where applicable
- Typechecking
- Linting
- Build verification
- API verification
- Database verification where applicable
- Security verification
- Configuration verification

Only report a check as PASSED if it was actually executed and passed.

Never claim:

- "tested"
- "verified"
- "working"
- "connected"
- "production-ready"

without evidence.

---

# 28. DEVELOPMENT WORKFLOW

For every implementation task, follow:

## STEP 1 — INSPECT

Inspect:

- Repository structure
- Relevant files
- Existing configuration
- Existing dependencies
- Existing implementation
- Current phase
- Applicable specifications

## STEP 2 — PLAN

Determine:

- What needs to change
- Why it needs to change
- Which files are affected
- Which dependencies are required
- Which external resources are required
- Which operations could be destructive

## STEP 3 — IMPLEMENT

Implement only the approved scope.

Do not expand scope silently.

## STEP 4 — VERIFY

Run appropriate:

- Tests
- Typecheck
- Lint
- Build
- Runtime verification
- Database verification when applicable

## STEP 5 — REVIEW

Check:

- Security
- Architecture
- Phase boundaries
- Configuration
- Error handling
- Unnecessary dependencies
- Accidental business functionality

## STEP 6 — REPORT

Report:

- What changed
- Files changed
- Verification performed
- Verification results
- Remaining blockers
- Required manual action, if any

---

# 29. CONTINUOUS IMPLEMENTATION RULE

Antigravity should work continuously through the approved implementation
scope rather than unnecessarily stopping after every small change.

When multiple independent tasks remain:

1. Complete the next approved task.
2. Verify it.
3. Continue to the next independent task.
4. Stop only when:
   - the approved scope is complete,
   - a genuine blocker prevents further safe progress,
   - a specification conflict exists,
   - required authorization is missing,
   - or a destructive/production-sensitive operation requires explicit approval.

Do NOT stop simply because one external dependency is unavailable if other
approved work can continue safely.

Do NOT repeatedly ask the project owner for confirmation of already established
requirements.

---

# 30. TOKEN / CONTEXT EFFICIENCY

Development agents must minimize unnecessary context consumption.

Rules:

- Do not repeatedly reread unchanged files.
- Do not repeatedly explain the entire project.
- Do not regenerate already completed work.
- Do not repeatedly inspect unrelated directories.
- Do not repeatedly ask questions whose answers are already documented.
- Use the existing repository state as the source of truth.
- Summarize completed work concisely.
- Focus tool usage on files relevant to the current task.
- Do not continuously produce verbose progress commentary.
- Perform implementation in coherent batches when safe.
- Verify after meaningful batches rather than after every trivial edit.

If a task is complete and verified, move to the next approved task.

---

# 31. MCP USAGE

MCP integrations are development tools.

An MCP connection does NOT automatically become an application runtime
connection.

When an MCP integration is available:

1. Identify which external project/resource it is connected to.
2. Verify that it is the intended project.
3. Use it only for operations supported by the MCP integration.
4. Do not assume MCP credentials are available to the application.
5. Do not copy secrets into source code.
6. Do not expose MCP credentials.
7. Do not perform destructive operations without authorization.

For Supabase specifically:

Supabase MCP ≠ Prisma DATABASE_URL.

Both may be required for different purposes.

---

# 32. EXTERNAL SERVICE BLOCKER POLICY

If an external service is required and unavailable:

Examples:

- Supabase
- Redis
- Storage
- Third-party API
- OAuth provider
- Telephony provider

Antigravity MUST report:

1. Service
2. Exact missing requirement
3. Why it is required
4. Whether work can continue without it
5. Exact manual action required from the project owner

Example:

BLOCKER:
Supabase PostgreSQL runtime connection is not configured.

Required:
DATABASE_URL and/or DIRECT_URL for the selected Supabase project.

Impact:
Prisma database operations cannot be verified.

Can continue:
Frontend, unit tests, typechecking, linting, build, API structure.

Required manual action:
Add the selected Supabase project's PostgreSQL connection string to
the local environment configuration.

Do NOT simply report:

"Database blocked."

The blocker must be actionable.

---

# 33. GIT

Git is the source-control system.

The repository MUST:

- Ignore secrets
- Ignore node_modules
- Ignore build artifacts
- Ignore generated files where appropriate
- Track `.env.example`
- Track source code
- Track configuration required for reproducible development

Never commit:

- `.env`
- real API keys
- database passwords
- service-role keys
- private tokens
- credentials

---

# 34. CI/CD

CI/CD must verify appropriate project quality gates.

Expected checks may include:

- Install
- Lint
- Typecheck
- Unit tests
- Build

Additional checks may be introduced in later phases.

CI MUST NOT require unavailable production credentials for checks that do
not actually require them.

Database integration tests that require a real database must use explicitly
configured test infrastructure.

---

# 35. DOCUMENTATION

Documentation must reflect the actual implementation.

Never document functionality that does not exist.

Never claim infrastructure is connected if it has not been verified.

Documentation must identify:

- Current phase
- Implemented functionality
- Configuration requirements
- Known blockers
- Verification status

---

# 36. PHASES

Phase 0
Product and Architecture Foundation

Phase 1
Production Project Foundation

Phase 2
Authentication and Identity

Phase 3
Organizations and Multi-Tenancy

Phase 4
Users, Teams and RBAC

Phase 5
CRM Core

Phase 6
Leads

Phase 7
Pipelines and Deals

Phase 8
Activities, Tasks and Calendar

Phase 9
Campaigns

Phase 10
Agents and Team Operations

Phase 11
Telephony

Phase 12
Call Recordings and Storage

Phase 13
Messaging and Conversations

Phase 14
Automation and Workflows

Phase 15
Notifications

Phase 16
Search

Phase 17
Reports and Analytics

Phase 18
AI CRM

Phase 19
Billing and Subscriptions

Phase 20
Integrations and Webhooks

Phase 21
Security Hardening

Phase 22
Performance and Scalability

Phase 23
CI/CD and Deployment

Phase 24
Production QA

Phase 25
Production Launch

---

# 37. CURRENT PHASE

Current phase:

PHASE 1 — PRODUCTION PROJECT FOUNDATION

Phase 1 establishes engineering infrastructure only.

No CRM business functionality is allowed.

The objective is to establish a clean, verifiable, production-ready technical
foundation for subsequent phases.

---

# 38. PHASE 1 EXPECTED FOUNDATION

Phase 1 may include:

- Monorepo
- Package management
- Turborepo
- NestJS application foundation
- Next.js application foundation
- TypeScript configuration
- Environment configuration
- API foundation
- Health endpoint
- Error handling
- Logging foundation
- OpenAPI foundation
- Prisma foundation
- Database module foundation
- Testing foundation
- Linting
- Typechecking
- Build pipeline
- CI foundation

Only items approved by the Phase 1 specification should be implemented.

---

# 39. PHASE 1 PROHIBITED FUNCTIONALITY

The following MUST NOT be implemented during Phase 1 unless explicitly
authorized:

- Authentication
- User registration
- Login
- Organizations
- Memberships
- Teams
- RBAC
- Contacts
- Companies
- Leads
- Deals
- Pipelines
- Activities
- Tasks
- Campaigns
- Telephony
- Messaging
- Conversations
- AI lead scoring
- Reports
- Billing
- CRM dashboards
- CRM business workflows

Creating technical foundations for future phases is allowed.

Implementing the actual future business functionality is not.

---

# 40. DATABASE STATE REPORTING

Whenever database work is relevant, report one of:

CONNECTED

The application successfully connected to the intended Supabase PostgreSQL
database and the connection was verified.

PARTIALLY CONFIGURED

Required configuration exists but complete verification has not yet been
performed.

BLOCKED

A specific required configuration or authorization is missing.

NOT REQUIRED

The current task does not require database connectivity.

Never use vague status descriptions.

---

# 41. FINAL COMPLETION STANDARD

A phase is complete only when:

1. Approved functionality is implemented.
2. Prohibited functionality has not been introduced.
3. Architecture is respected.
4. Security requirements are respected.
5. Configuration is reproducible.
6. Tests pass where applicable.
7. Typechecking passes.
8. Linting passes.
9. Build passes.
10. External dependencies are verified where required.
11. Documentation reflects actual state.
12. Remaining blockers are explicitly documented.

---

# 42. NON-NEGOTIABLE RULE

Correctness is more important than speed.

If required information cannot be verified:

DO NOT GUESS.

If the information is required to safely perform the current operation:

STOP THAT OPERATION.

Report the exact blocker.

Continue all other independent approved work that can be safely completed.

Never fabricate:

- credentials
- database URLs
- database schemas
- API responses
- files
- dependencies
- environment variables
- external service configuration
- successful verification

Always inspect, implement, verify, and report.

---

# 43. CURRENT DATABASE SETUP EXPECTATION

The project owner has already created the intended Supabase project.

Therefore Antigravity MUST NOT create a new Supabase project unless explicitly
instructed.

The remaining application-side setup is:

1. Identify the intended Supabase project.
2. Obtain its PostgreSQL connection details.
3. Configure the application's local environment securely.
4. Configure Prisma to use those environment variables.
5. Verify the PostgreSQL connection.
6. Generate/validate Prisma Client.
7. Create or apply migrations only when authorized by the current phase.
8. Verify the resulting database state.

If Supabase MCP is connected but Prisma cannot connect:

DO NOT assume the MCP connection is broken.

Treat MCP connectivity and PostgreSQL runtime connectivity as separate
connections.

Report exactly which connection works and which one is missing.

---

# 44. PROJECT OWNER MANUAL ACTIONS

When Antigravity requires a secret or credential that only the project owner
can provide, the project owner should perform the manual secret entry.

Typical manual action:

Create/update the local environment file required by the application and
provide the required Supabase PostgreSQL connection values.

Do not put real credentials inside:

- MASTER.md
- source code
- Git
- README files
- prompts
- Prisma schema
- API responses

The agent should then verify the configuration rather than asking the project
owner to paste the secret into chat.

---

# END OF MASTER.md