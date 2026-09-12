# MINSTOCS CRM
# PROJECT STRUCTURE

---

# 1. IMPORTANT RULE

This document defines the architectural organization.

It does NOT authorize blindly creating every directory.

Antigravity must inspect the repository first.

Only required directories/files should be created.

---

# 2. TARGET HIGH-LEVEL STRUCTURE

minstocs-crm/

├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   └── config/
│
├── infrastructure/
│   ├── docker/
│   └── redis/
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── scripts/
│
├── docs/
│
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md

---

# 3. FRONTEND

apps/web/

Potential organization:

app/
components/
features/
hooks/
lib/
providers/
types/

Feature folders must contain feature-specific UI and logic.

---

# 4. BACKEND

apps/api/src/

Potential organization:

common/
config/
database/
redis/
health/

Future modules are added when their phases begin.

---

# 5. DATABASE LOCATION

There must be exactly one authoritative Prisma schema.

There must not be multiple competing Prisma schemas.

The exact location must be established during repository inspection.

Recommended location for a monorepo is either:

apps/api/prisma/

or

a dedicated database package.

The final location must be based on the actual repository architecture.

---

# 6. MIGRATION OWNERSHIP

The project must have one clearly defined migration authority.

Do not allow:

Prisma migrations
+
untracked manual database changes
+
independent competing migration systems

to become competing sources of truth.

Any Supabase-specific SQL that cannot be represented through Prisma must be explicitly documented and version controlled.

---

# 7. SHARED PACKAGES

Shared packages must contain genuinely reusable code.

Examples:

packages/ui
packages/types
packages/validation
packages/config

Do not create packages only to make the repository look more sophisticated.

---

# 8. FUTURE FEATURE MODULES

Future modules are NOT required in Phase 1.

They should be introduced when their implementation phase begins.

---

# 9. STRUCTURE PRINCIPLE

Organize around ownership and responsibility.

Avoid:

- giant utility folders
- giant components
- cross-module imports
- duplicate types
- duplicate API clients
- duplicate validation logic