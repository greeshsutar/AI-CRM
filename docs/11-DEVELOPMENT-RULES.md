# MINSTOCS CRM
# DEVELOPMENT RULES

Status: NON-NEGOTIABLE

---

# 1. VERIFY BEFORE MODIFYING

Before changing anything:

INSPECT FIRST.

Never assume.

---

# 2. NO HALLUCINATION

Never invent:

- files
- folders
- APIs
- database tables
- database columns
- dependencies
- environment variables
- credentials
- Supabase resources
- Redis resources
- existing functionality
- configuration
- scripts

If something cannot be verified:

MARK IT AS UNVERIFIED.

---

# 3. REPOSITORY INSPECTION

Before implementation inspect:

- directory structure
- package.json
- lockfiles
- workspace configuration
- Node version
- TypeScript configuration
- framework versions
- dependencies
- scripts
- environment files
- Git status
- existing tests
- existing Docker configuration
- CI configuration

---

# 4. SUPABASE VERIFICATION

Before changing Supabase or the database:

Inspect the actual Supabase environment through the available MCP.

Verify:

- project
- schemas
- tables
- migrations
- relevant database objects
- current state

If the required MCP access is unavailable:

STOP.

Do not fabricate the database state.

---

# 5. DATABASE RULE

Never assume a table does not exist.

Never create a table without verifying the existing schema.

Never create duplicate schema definitions.

---

# 6. FILE RULE

Do not modify unrelated files.

Do not rewrite working code simply because a different architecture is preferred.

---

# 7. DEPENDENCY RULE

Before installing:

1. Check whether the dependency already exists.
2. Confirm the requirement.
3. Check compatibility.
4. Determine whether an existing dependency can solve the requirement.
5. Install only when justified.

---

# 8. NO SPECULATIVE INFRASTRUCTURE

Do not add:

- GraphQL
- WebSockets
- queues
- microservices
- search engines
- monitoring platforms
- external providers

just because future phases might need them.

Implement infrastructure when the current requirement justifies it.

---

# 9. API RULE

Never invent an endpoint.

Never invent a request field.

Never invent a response field.

Never silently change an API contract.

---

# 10. FRONTEND RULE

The frontend must consume verified backend contracts.

If the backend endpoint does not exist:

DO NOT mock it as production functionality.

Report:

MISSING API CONTRACT.

---

# 11. MOCK RULE

Mocks are allowed for automated tests.

Mocks are not allowed as substitutes for missing production functionality.

---

# 12. SECURITY RULE

Never bypass:

- authentication
- authorization
- validation
- tenant isolation
- security checks

to make an implementation work.

---

# 13. ERROR RULE

Never hide errors.

Do not:

- swallow exceptions
- disable TypeScript checks
- suppress lint failures
- ignore test failures
- use `any` to hide type problems
- remove validation to fix failures

---

# 14. DATABASE CHANGE RULE

Before every database change:

1. inspect current state
2. inspect migrations
3. identify impact
4. implement
5. migrate
6. verify
7. test

---

# 15. COMMAND RULE

Do not invent npm/pnpm scripts.

Inspect package.json before using project-specific commands.

---

# 16. BUILD VERIFICATION

Only report a build as passing if the build command actually executed successfully.

---

# 17. TEST VERIFICATION

Only report tests as passing if they were actually executed.

---

# 18. BLOCKER RULE

If required information is unavailable:

STOP.

Report:

## BLOCKER

Description:

[exact blocker]

Required information:

[exact missing information]

Do not continue by guessing.

---

# 19. PHASE BOUNDARY

Do not implement functionality belonging to another phase.

If the current implementation reveals a dependency on a future phase:

Report it.

Do not silently implement the future feature.

---

# 20. CHANGE REPORT

Every implementation task must finish with:

## Summary

## Files Created

## Files Modified

## Files Deleted

## Dependencies Added

## Database Changes

## Supabase Changes

## Commands Executed

## Verification Results

## Known Issues

## Unverified Items

## Blockers

## Next Step

---

# 21. FINAL RULE

Correctness > speed.

Verified implementation > assumed implementation.

Real functionality > fake functionality.

Explicit blocker > guessed solution.
