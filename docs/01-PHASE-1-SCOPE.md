# Phase 1 — MVP Scope

> **Target Duration:** 6-8 weeks  
> **Goal:** Deliver a functional CRM with core CRUD operations, authentication, and a polished dashboard.

---

## 1. MVP Feature Set

### 1.1 Authentication & User Management
- [x] Email/Password sign-up and sign-in
- [ ] OAuth providers (Google, GitHub)
- [ ] Password reset flow
- [ ] User profile management (name, avatar, role)
- [ ] Role-based access control (Admin, Manager, Sales Rep)
- [ ] Invite team members via email

### 1.2 Contacts Module
- [ ] Create, read, update, delete contacts
- [ ] Contact fields: name, email, phone, company, title, source, status
- [ ] Contact list with search, filter, sort, pagination
- [ ] Contact detail view with activity timeline
- [ ] Import contacts from CSV
- [ ] Tag/label system for contacts

### 1.3 Companies Module
- [ ] Create, read, update, delete companies
- [ ] Company fields: name, domain, industry, size, revenue, location
- [ ] Link contacts to companies (many-to-one)
- [ ] Company detail view with associated contacts and deals
- [ ] Company list with search and filters

### 1.4 Deals / Pipeline Module
- [ ] Create, read, update, delete deals
- [ ] Deal fields: name, value, stage, probability, expected close date, owner
- [ ] Kanban board view (drag-and-drop between stages)
- [ ] Deal list/table view with sorting and filters
- [ ] Customizable pipeline stages
- [ ] Deal detail view with activity log
- [ ] Associate deals with contacts and companies

### 1.5 Tasks & Activities
- [ ] Create tasks linked to contacts, companies, or deals
- [ ] Task types: Call, Email, Meeting, Follow-up, Custom
- [ ] Due dates with overdue highlighting
- [ ] Task status: Pending, In Progress, Completed
- [ ] Activity timeline on entity detail pages
- [ ] Log notes and interactions

### 1.6 Dashboard
- [ ] Sales pipeline overview (total value per stage)
- [ ] Recent activity feed
- [ ] Key metrics: total contacts, open deals, revenue won/lost
- [ ] Tasks due today / overdue
- [ ] Simple charts (bar, pie, line)

### 1.7 Global Features
- [ ] Global search across contacts, companies, deals
- [ ] Responsive design (desktop + tablet)
- [ ] Dark/light mode toggle
- [ ] Toast notifications for actions
- [ ] Breadcrumb navigation
- [ ] Empty states with helpful CTAs

---

## 2. Out of Scope (Phase 1)

| Feature | Deferred To |
|---|---|
| AI lead scoring | Phase 2 |
| Email integration (Gmail/Outlook) | Phase 2 |
| AI email generation | Phase 2 |
| Workflow automation | Phase 3 |
| Custom reports builder | Phase 3 |
| Mobile app | Phase 3 |
| Multi-tenancy / workspaces | Phase 4 |
| API marketplace | Phase 4 |
| Third-party integrations (Slack, Zapier) | Phase 3 |

---

## 3. Milestones

| Milestone | Target | Description |
|---|---|---|
| **M1: Foundation** | Week 1-2 | Project setup, auth, database schema, base UI layout |
| **M2: Core Modules** | Week 3-4 | Contacts, Companies CRUD with list/detail views |
| **M3: Pipeline** | Week 5-6 | Deals module, Kanban board, pipeline management |
| **M4: Activities** | Week 6-7 | Tasks, activity timeline, notes, dashboard |
| **M5: Polish** | Week 7-8 | Search, filters, responsive design, testing, bug fixes |

---

## 4. Success Criteria

- [ ] User can sign up, sign in, and manage their profile
- [ ] Full CRUD on Contacts, Companies, and Deals
- [ ] Kanban board with drag-and-drop deal management
- [ ] Dashboard displaying real-time pipeline metrics
- [ ] Task management with due dates
- [ ] Global search across all entities
- [ ] RLS policies enforcing data isolation
- [ ] < 2s page load time on all views
- [ ] 90%+ Lighthouse accessibility score
