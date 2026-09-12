# MINSTOCS CRM
# FRONTEND SPECIFICATION

---

# 1. FRAMEWORK

Next.js
React
TypeScript

---

# 2. FRONTEND RESPONSIBILITIES

The frontend is responsible for:

- rendering
- navigation
- user interaction
- form handling
- client-side validation
- API communication
- UI state
- server-state presentation

The frontend must not be the source of truth for security or business authorization.

---

# 3. API CLIENT

All backend communication should go through a centralized API client layer.

Do not scatter raw HTTP calls across arbitrary components.

The API client must support the actual backend contract.

---

# 4. SERVER STATE

Use TanStack Query where appropriate for:

- fetching
- caching
- mutations
- invalidation
- loading state
- server errors

Do not duplicate server state unnecessarily in global client state.

---

# 5. CLIENT STATE

Use local component state by default.

Use Zustand only where state genuinely needs to be shared across unrelated components/pages.

---

# 6. FORMS

Use React Hook Form where appropriate.

Use Zod or the approved validation strategy for client-side validation.

Client-side validation does not replace backend validation.

---

# 7. UI

Preferred UI foundation:

- Tailwind CSS
- shadcn/ui
- Radix UI where required

The application should maintain:

- consistent spacing
- typography
- interaction patterns
- forms
- tables
- dialogs
- notifications
- loading states
- empty states
- error states

---

# 8. ACCESSIBILITY

Interactive UI must provide:

- semantic HTML
- keyboard accessibility
- visible focus
- accessible labels
- accessible error messaging

---

# 9. PERFORMANCE

Avoid:

- unnecessary client components
- unnecessary global state
- repeated API requests
- large unoptimized assets
- unnecessary re-renders

Use server rendering/server components where appropriate.

---

# 10. ENVIRONMENT SECURITY

Only explicitly public configuration may be exposed to browser-side code.

Private credentials must never be included in client bundles.

---

# 11. PHASE 1 UI

Phase 1 must provide only the UI required to verify the foundation.

Do not build CRM business screens during Phase 1.

---

# 12. FRONTEND/BACKEND CONTRACT

The frontend must consume the verified backend API.

The frontend must not invent:

- endpoints
- response fields
- error structures
- authentication behavior
- database fields

If the API contract is missing:

STOP and report the missing contract.