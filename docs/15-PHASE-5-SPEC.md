# MINSTOCS CRM — PHASE 5 — CRM CORE SPECIFICATION

STATUS:
DRAFT — REQUIRES EXPLICIT APPROVAL BEFORE IMPLEMENTATION

---

## 1. PURPOSE
This specification defines the architectural and functional requirements for Phase 5 of the MINSTOCS CRM project. It establishes the core CRM business entities (Leads, Contacts, Companies, Activities, and Notes) upon which future business processes (e.g., campaigns, telephony, AI scoring, messaging) will be built.

## 2. PHASE 5 OBJECTIVE
Define and establish the first CRM business layer for MINSTOCS CRM.
The objective is to provide the foundational data structures, APIs, and basic UI for managing Leads, Contacts, Companies, Activities, and Notes, while enforcing strict tenant isolation and existing RBAC authorization.

## 3. SCOPE
- Lead domain and lifecycle
- Contact domain
- Company domain
- Activity domain (basic tracking of calls, meetings, tasks, emails)
- Notes
- Lead conversion workflow (Lead to Contact/Company)
- Entity ownership and assignment (User and Team)
- Database schema design (Prisma) for the above entities
- API design for basic CRUD and lifecycle management
- Audit logging for critical CRM actions
- Basic UI specification for CRM views

## 4. OUT OF SCOPE
- Lead Generation systems (scraping, AI generation, inbound lead webhooks, external lead APIs)
- Lead enrichment providers
- AI lead scoring or predictive ML
- Telephony integration (dialers, real-time call tracking)
- Messaging integration (SMS, WhatsApp, email delivery)
- Automation rules and complex workflows
- Campaigns and bulk operations
- Complex reporting and analytics
- Pipeline/Deals (reserved for a later Pipeline specific phase, unless required for conversion, but keeping strictly to Leads/Contacts/Companies here)

## 5. EXISTING PLATFORM DEPENDENCIES
Phase 5 explicitly builds upon and depends on the Phase 1-4 Foundation:
- **Authentication:** All CRM APIs must be protected by the established `JwtAuthGuard`.
- **Users:** CRM entities are owned/assigned to existing `User` records.
- **Organizations:** All CRM entities are strictly scoped to an `Organization`.
- **Memberships:** Used to validate user association with an Organization.
- **RBAC:** Authorization is enforced via the existing `RolesGuard` (`CUSTOMER_ADMIN`, `MANAGER`, `AGENT`).
- **Teams:** CRM entities may be assigned to or visible to specific `Team`s via `TeamMember` relationships.
- **Audit Logs:** The existing `AuditLogsService` will be used to record significant CRM events (e.g., Lead Creation, Lead Conversion).

## 6. MULTI-TENANCY MODEL
- Every CRM entity (Lead, Contact, Company, Activity, Note) MUST include an `organizationId` foreign key referencing the `organizations` table.
- **Tenant Isolation:** All database queries, API endpoints, and business logic MUST filter and validate the `organizationId` against the currently authenticated user's active `Membership`.
- A user must never access, view, or modify a CRM entity belonging to an organization they do not have a valid membership for.
- Cross-tenant data sharing is strictly forbidden.

## 7. LEAD DOMAIN
A Lead represents an unqualified individual or prospect who may become a customer.
- **id:** UUID (Primary Key)
- **organizationId:** UUID (Foreign Key to Organization)
- **firstName:** String (optional)
- **lastName:** String (optional)
- **email:** String (optional, indexed)
- **phone:** String (optional, indexed)
- **companyName:** String (optional) - Represents the name of the company they work for before formal conversion.
- **source:** String (optional) - Where the lead came from (e.g., "Manual", "Website").
- **status:** Enum - The current lifecycle stage.
- **ownerId:** UUID (Foreign Key to User, optional) - The user assigned to work the lead.
- **teamId:** UUID (Foreign Key to Team, optional) - The team assigned to work the lead.
- **createdAt:** DateTime
- **updatedAt:** DateTime
- **Archive/Deletion:** Leads should support soft deletion or archiving (e.g., an `isArchived` boolean) rather than hard deletion to maintain referential integrity in audit logs and activities.

## 8. LEAD LIFECYCLE
Authoritative Lead Statuses:
- `NEW`: Newly created, unworked.
- `CONTACTED`: Communication attempted or established.
- `QUALIFIED`: Met criteria to become a Contact/Company.
- `UNQUALIFIED`: Did not meet criteria; dead lead.
- `CONVERTED`: Successfully converted into a formal Contact (and Company).

- **Valid Transitions:** `NEW` -> `CONTACTED` -> `QUALIFIED` / `UNQUALIFIED` -> `CONVERTED`.
- **Invalid Transitions:** A `CONVERTED` lead cannot revert to `NEW`.
- **Who can change status:** The assigned `ownerId`, members of the assigned `teamId`, `MANAGER`, or `CUSTOMER_ADMIN`.
- **Conversion Behavior:** Moving to `CONVERTED` status triggers the Lead Conversion workflow (creates Contact and Company).

## 9. CONTACT DOMAIN
A Contact represents a qualified individual (usually post-conversion).
- **id:** UUID (Primary Key)
- **organizationId:** UUID (Foreign Key)
- **firstName:** String
- **lastName:** String
- **email:** String (optional)
- **phone:** String (optional)
- **companyId:** UUID (Foreign Key to Company, optional)
- **ownerId:** UUID (Foreign Key to User, optional)
- **leadId:** UUID (Foreign Key to Lead, optional) - Links back to the original Lead.
- **Uniqueness Rules:** `[organizationId, email]` and `[organizationId, phone]` should ideally be unique, but requires product approval as B2B CRMs sometimes allow duplicate emails.
- **Relationships:** A Contact belongs to one Organization, optionally belongs to one Company, and is optionally derived from one Lead.

## 10. COMPANY DOMAIN
A Company represents a qualified business entity.
- **id:** UUID (Primary Key)
- **organizationId:** UUID (Foreign Key)
- **name:** String
- **domain:** String (optional)
- **industry:** String (optional)
- **ownerId:** UUID (Foreign Key to User, optional)
- **Uniqueness Rules:** `[organizationId, name]` or `[organizationId, domain]` uniqueness recommended.
- **Relationships:** A Company has many Contacts.

## 11. ACTIVITY DOMAIN
An Activity represents a discrete action or event related to a CRM entity.
- **id:** UUID
- **organizationId:** UUID
- **type:** Enum (`CALL`, `MEETING`, `EMAIL`, `TASK`)
- **subject:** String
- **description:** String (optional)
- **dueDate:** DateTime (optional)
- **completedAt:** DateTime (optional)
- **status:** Enum (`PENDING`, `COMPLETED`, `CANCELED`)
- **ownerId:** UUID (Foreign Key to User) - Who is performing the activity.
- **leadId:** UUID (optional)
- **contactId:** UUID (optional)
- **companyId:** UUID (optional)
- Note: Only one target entity (Lead, Contact, or Company) should typically be linked.
- This phase handles manual tracking only. Integration with actual telephony/email providers is OUT OF SCOPE.

## 12. NOTES
Notes provide arbitrary text commentary on CRM entities.
- **id:** UUID
- **organizationId:** UUID
- **content:** Text
- **authorId:** UUID (Foreign Key to User)
- **leadId:** UUID (optional)
- **contactId:** UUID (optional)
- **companyId:** UUID (optional)

## 13. LEAD CONVERSION
When a Lead is converted:
1. **Validation:** The Lead must not already be `CONVERTED`.
2. **Contact Creation:** A new `Contact` is created using the Lead's first name, last name, email, and phone. The `leadId` is populated on the Contact.
3. **Company Creation/Association:** If the Lead has a `companyName`, the system attempts to find an existing `Company` by name. If found, the Contact is linked. If not, a new `Company` is created.
4. **Duplicate Handling:** If a Contact with the same email already exists, the conversion should either fail and prompt the user, or merge (Requires Product Approval - default to fail with conflict error for safety).
5. **Lead Status:** The Lead `status` is updated to `CONVERTED`.
6. **Ownership:** The new Contact and Company inherit the Lead's `ownerId` and `teamId` by default.
7. **Audit Log:** An audit event `lead.converted` is generated.
8. **Transactional Behavior:** The entire conversion process MUST execute within a single Prisma transaction to guarantee data consistency.

## 14. OWNERSHIP AND ASSIGNMENT
- **Organization Ownership:** All records are owned by the Organization.
- **User Assignment:** `ownerId` denotes the specific agent responsible.
- **Team Assignment:** `teamId` denotes the team responsible.
- **Who can assign:** `MANAGER` or `CUSTOMER_ADMIN` can assign records to anyone. `AGENT` can self-assign unassigned records.
- **Who can view:** `CUSTOMER_ADMIN` and `MANAGER` can view all organization records. `AGENT` can view records assigned to them, their team, or unassigned records.
- **Who can modify:** Same as view permissions.
- **RBAC Interactions:** Existing `@Roles()` guard will authorize the route, and service-level logic will enforce owner/team visibility constraints based on the current user.

## 15. DATABASE DESIGN
Proposed Prisma schema additions (DO NOT IMPLEMENT YET):

```prisma
enum LeadStatus {
  NEW
  CONTACTED
  QUALIFIED
  UNQUALIFIED
  CONVERTED
}

enum ActivityType {
  CALL
  MEETING
  EMAIL
  TASK
}

enum ActivityStatus {
  PENDING
  COMPLETED
  CANCELED
}

model Lead {
  id             String     @id @default(uuid()) @db.Uuid
  organizationId String     @db.Uuid
  firstName      String?
  lastName       String?
  email          String?
  phone          String?
  companyName    String?
  source         String?
  status         LeadStatus @default(NEW)
  ownerId        String?    @db.Uuid
  teamId         String?    @db.Uuid
  isArchived     Boolean    @default(false)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  owner        User?        @relation(fields: [ownerId], references: [id], onDelete: SetNull)
  team         Team?        @relation(fields: [teamId], references: [id], onDelete: SetNull)
  contacts     Contact[]
  activities   Activity[]
  notes        Note[]

  @@index([organizationId])
  @@index([email])
  @@map("leads")
}

model Contact {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid
  firstName      String
  lastName       String
  email          String?
  phone          String?
  companyId      String?  @db.Uuid
  ownerId        String?  @db.Uuid
  leadId         String?  @db.Uuid
  isArchived     Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  company      Company?     @relation(fields: [companyId], references: [id], onDelete: SetNull)
  owner        User?        @relation(fields: [ownerId], references: [id], onDelete: SetNull)
  lead         Lead?        @relation(fields: [leadId], references: [id], onDelete: SetNull)
  activities   Activity[]
  notes        Note[]

  @@index([organizationId])
  @@index([email])
  @@map("contacts")
}

model Company {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid
  name           String
  domain         String?
  industry       String?
  ownerId        String?  @db.Uuid
  isArchived     Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  owner        User?        @relation(fields: [ownerId], references: [id], onDelete: SetNull)
  contacts     Contact[]
  activities   Activity[]
  notes        Note[]

  @@index([organizationId])
  @@map("companies")
}

model Activity {
  id             String         @id @default(uuid()) @db.Uuid
  organizationId String         @db.Uuid
  type           ActivityType
  subject        String
  description    String?
  dueDate        DateTime?
  completedAt    DateTime?
  status         ActivityStatus @default(PENDING)
  ownerId        String         @db.Uuid
  leadId         String?        @db.Uuid
  contactId      String?        @db.Uuid
  companyId      String?        @db.Uuid
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  owner        User         @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  lead         Lead?        @relation(fields: [leadId], references: [id], onDelete: Cascade)
  contact      Contact?     @relation(fields: [contactId], references: [id], onDelete: Cascade)
  company      Company?     @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([ownerId])
  @@map("activities")
}

model Note {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid
  content        String
  authorId       String   @db.Uuid
  leadId         String?  @db.Uuid
  contactId      String?  @db.Uuid
  companyId      String?  @db.Uuid
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  author       User         @relation(fields: [authorId], references: [id], onDelete: Cascade)
  lead         Lead?        @relation(fields: [leadId], references: [id], onDelete: Cascade)
  contact      Contact?     @relation(fields: [contactId], references: [id], onDelete: Cascade)
  company      Company?     @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@map("notes")
}
```

## 16. API DESIGN
All endpoints are prefixed with `/api/v1` and require `JwtAuthGuard` and `RolesGuard`.

**Leads:**
- `POST /leads` (Create a lead)
- `GET /leads` (List leads with filtering/pagination)
- `GET /leads/:id` (Retrieve single lead)
- `PATCH /leads/:id` (Update lead details)
- `PATCH /leads/:id/status` (Update status only)
- `PATCH /leads/:id/assign` (Assign to user/team)
- `POST /leads/:id/convert` (Convert lead to contact/company)
- `DELETE /leads/:id` (Archive lead)

**Contacts:**
- `POST /contacts`
- `GET /contacts`
- `GET /contacts/:id`
- `PATCH /contacts/:id`

**Companies:**
- `POST /companies`
- `GET /companies`
- `GET /companies/:id`
- `PATCH /companies/:id`

**Activities:**
- `POST /activities`
- `GET /activities` (Query by leadId/contactId/companyId)
- `GET /activities/:id`
- `PATCH /activities/:id` (Update/complete activity)

**Notes:**
- `POST /notes`
- `GET /notes` (Query by leadId/contactId/companyId)
- `PATCH /notes/:id`
- `DELETE /notes/:id`

**Validation:** Use `class-validator` DTOs.
**Responses:** Standard JSON object with `data` and `meta` (for pagination).
**Errors:** Standard NestJS `HttpException` (400 Bad Request, 403 Forbidden, 404 Not Found).

## 17. SEARCH AND FILTERING
Minimum supported queries for list endpoints:
- `search` (Text search on name, email, phone)
- `status` (Enum filter for Leads/Activities)
- `ownerId` (Filter by assigned user)
- `teamId` (Filter by assigned team)
- `source` (Filter by Lead source)
- `companyId` (Filter Contacts by Company)
- `page` & `limit` (Offset-based pagination)
- `sortBy` & `sortOrder` (Sort by createdAt, updatedAt, name)

## 18. SECURITY
- **Organization Isolation:** Every query MUST `where: { organizationId: currentOrgId }`.
- **Authorization:** `RolesGuard` applies. `AGENT`s require strict data-access scoping based on `ownerId` and `teamId`.
- **IDOR Protection:** Validating `organizationId` inherently protects against cross-tenant IDOR.
- **Audit Logging:** Critical actions (`lead.created`, `lead.converted`, `contact.created`) must be logged using the existing `AuditLogsService`.
- **Archive Behavior:** Use soft-deletes (`isArchived: true`) for CRM entities to preserve referential integrity in logs and activity history.

## 19. FRONTEND
The frontend UI will consume the APIs to provide:
- **Lead List:** Data table with search, filters, and pagination.
- **Lead Detail:** Split view showing Lead fields, Activity timeline, and Notes.
- **Lead Creation/Edit:** Standard React Hook Form with Zod validation.
- **Lead Conversion Modal:** UI to confirm conversion and handle duplicate detection.
- **Contact/Company List & Detail:** Standard data tables and detail views.
- **Activity Timeline:** Chronological feed of Activities and Notes on detail pages.

## 20. AUDIT LOGGING
The following actions must produce an `audit_logs` record:
- `lead.created`, `lead.updated`, `lead.archived`, `lead.converted`
- `contact.created`, `contact.updated`, `contact.archived`
- `company.created`, `company.updated`, `company.archived`
- `activity.created`, `activity.completed`

## 21. TESTING
- **Unit Tests:** Service layer business logic, particularly Lead Conversion duplicate handling and status transition rules.
- **Controller/API Tests:** Validate request routing and DTO validation.
- **Authorization/Tenant-Isolation Tests:** Ensure `AGENT` cannot read unassigned leads; ensure cross-tenant data requests return 404/403.
- **Conversion Tests:** Verify the Prisma transaction creates the Contact, Company, updates Lead status, and creates the Audit Log reliably.
- **E2E Tests:** Happy path Lead creation to conversion flow.

## 22. IMPLEMENTATION ORDER
- Task 1 — Database schema verification & Prisma migration.
- Task 2 — Leads Module (Service, Controller, DTOs).
- Task 3 — Companies & Contacts Modules.
- Task 4 — Lead Conversion logic (transactional).
- Task 5 — Activities & Notes Modules.
- Task 6 — Authorization & Tenant-Isolation verification.
- Task 7 — Audit Logging integration.
- Task 8 — Frontend CRM UI pages.
- Task 9 — Full End-to-End testing.

## 23. DEFINITION OF DONE
- `pnpm typecheck` and `pnpm lint` pass with 0 errors.
- Unit, Integration, and E2E tests pass for all CRM modules.
- Database migrations successfully applied without breaking existing Teams/RBAC tables.
- Tenant isolation is strictly enforced for all CRM endpoints.
- Lead Conversion accurately creates Contacts and Companies within a transaction.
- Audit logs are successfully generated for lifecycle events.
- Build command executes successfully.

## 24. FUTURE PHASE BOUNDARY
This phase establishes the foundational CRM entities. Future phases may build upon these entities to introduce:
- Lead Generation (Inbound Webhooks, Scraping, External APIs)
- CSV Import/Export
- Lead Enrichment
- AI Lead Scoring & Predictive ML
- Automated Marketing Campaigns
- Telephony and SMS Integration

These capabilities are **NOT** implemented by this Phase 5 specification.

## 25. RISKS / OPEN QUESTIONS
- **OPEN DECISION — REQUIRES PRODUCT APPROVAL:** Contact deduplication behavior during Lead Conversion. Should the system block conversion if an email matches, or automatically merge/associate the Lead to the existing Contact?
- **OPEN DECISION — REQUIRES PRODUCT APPROVAL:** Are Leads allowed to lack contact information (e.g., no email or phone), or is one method of contact strictly required at creation?

---

STATUS:
DRAFT — REQUIRES EXPLICIT APPROVAL
