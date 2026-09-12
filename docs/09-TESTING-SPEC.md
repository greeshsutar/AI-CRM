# MINSTOCS CRM
# TESTING SPECIFICATION

---

# 1. PRINCIPLE

Testing is part of implementation.

Tests must validate actual behavior.

Do not create tests that merely satisfy coverage metrics.

---

# 2. TEST LEVELS

## Unit

Used for isolated:

- functions
- utilities
- services
- business rules

---

## Integration

Used for interactions between components such as:

- API
- database
- repositories
- Redis where applicable

---

## End-to-End

Use Playwright for critical user journeys.

---

# 3. PHASE 1 TESTS

Phase 1 should verify:

- application startup
- API startup
- health endpoint
- configuration validation
- request validation
- error handling
- database connectivity
- Prisma connectivity
- Redis connectivity if Redis is part of Phase 1
- frontend/backend communication
- production build

---

# 4. TEST DATABASE

Tests must not accidentally execute against production.

Use isolated test configuration.

---

# 5. TEST DATA

Test data must be deterministic.

Do not rely on manually created production-like data.

---

# 6. FAILURE HANDLING

Never:

- disable failing tests
- skip tests without justification
- suppress errors
- change assertions merely to make tests pass
- claim a test passed without executing it

---

# 7. REQUIRED VERIFICATION

Before Phase 1 sign-off:

- lint
- typecheck
- unit tests
- integration tests where applicable
- E2E tests where applicable
- production build

The exact commands must be discovered from the actual repository.

---

# 8. REGRESSION

Future phases must preserve existing passing functionality.

---

# 9. TEST REPORT

Every phase completion report must include:

Command
Result
Failure details
Known limitations

---

# 10. QUALITY RULE

A green test suite does not automatically prove correctness.

Critical security, database and integration behavior must also be manually verified where appropriate.