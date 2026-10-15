# CRM API Inventory & Verification Status

## Executive Overview
This inventory documents all CRM API endpoints evaluated during the comprehensive integration audit between the SaaS Super Admin application and NexFlow CRM Engine. Every endpoint was tested via non-destructive live HTTP probes against the active CRM production gateway (`https://api.nexflowcrm.com/api/v1`) using active Bearer JWT authentication and code inspection.

---

## 1. Verified Active CRM API Endpoints (Live & Operational)

| # | HTTP Method | Endpoint Path | Authentication | Required Permissions | Expected Response | Corresponding Super Admin Feature | Integration Location | Verification Status |
|---|-------------|---------------|----------------|----------------------|-------------------|-----------------------------------|----------------------|---------------------|
| 1 | `POST` | `/auth/login` | None (Public) | None | `{ success: true, token, user }` | CRM Connect Gateway | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |
| 2 | `GET` | `/auth/me` | Bearer `<CRM_JWT>` | Authenticated Admin | `{ success: true, data: { id, email, role, ... } }` | Session Diagnostics & Health Check | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |
| 3 | `GET` | `/auth/company-users/all` | Bearer `<CRM_JWT>` | `users.view` | `{ success: true, data: Array<User> }` | CRM Company Users Directory | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |
| 4 | `GET` | `/company` | Bearer `<CRM_JWT>` | `organizations.view` | `{ success: true, data: Array<Company> }` | CRM Companies Ledger | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |
| 5 | `POST` | `/company` | Bearer `<CRM_JWT>` | `organizations.create` | `{ success: true, data: Company }` | Company Provisioning Adapter | Backend Service | **INTEGRATED BUT NOT VERIFIED** (Dry-run only to protect production) |
| 6 | `PUT` | `/company` | Bearer `<CRM_JWT>` | `organizations.update` | `{ success: true, data: Company }` | Company Profile Update | Backend Service | **INTEGRATED BUT NOT VERIFIED** (Non-destructive safety) |
| 7 | `GET` | `/leads` | Bearer `<CRM_JWT>` | `organizations.view` | `{ success: true, data: { items, total, ... } }` | CRM Leads & Conversion Matrix | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |
| 8 | `GET` | `/leads/stats` | Bearer `<CRM_JWT>` | `dashboard.view` | `{ total, hot, warm, cold, avgScore, ... }` | CRM Lead Analytics Cards | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |
| 9 | `GET` | `/leads/:id` | Bearer `<CRM_JWT>` | `organizations.view` | `{ success: true, data: Lead }` | Single Lead Inspection Modal | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |
| 10 | `GET` | `/activities` | Bearer `<CRM_JWT>` | `auditLogs.view` | `{ success: true, data: Array<Activity> }` | CRM Live Operational Activity Feed | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |
| 11 | `GET` | `/projects` | Bearer `<CRM_JWT>` | `plans.view` | `{ success: true, data: Array<Project> }` | CRM Projects & Service Lines Ledger | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |
| 12 | `GET` | `/projects/:id` | Bearer `<CRM_JWT>` | `plans.view` | `{ success: true, data: Project }` | Project Detail Inspection | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |
| 13 | `GET` | `/whatsapp/templates` | Bearer `<CRM_JWT>` | `settings.view` | `{ success: true, data: Array<Template> }` | WhatsApp Template Engine View | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |
| 14 | `GET` | `/teams` | Bearer `<CRM_JWT>` | `settings.view` | `{ success: true, data: Array<Team> }` | CRM Teams Explorer | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |
| 15 | `GET` | `/integrations` | Bearer `<CRM_JWT>` | `settings.view` | `{ success: true, data: Array<Integration> }` | CRM Third-Party Integrations | Backend & Frontend | **FULLY INTEGRATED AND VERIFIED** |

---

## 2. Discovered But Non-Existent CRM Endpoints (HTTP 404 in CRM)

The following endpoints were previously assumed or attempted by legacy integration code, but testing with active JWT credentials confirmed that Express returns `404 Cannot [METHOD] /api/v1/...`:

| # | HTTP Method | Endpoint Path | CRM Response | Root Cause & Resolution | Status |
|---|-------------|---------------|--------------|-------------------------|--------|
| 16 | `GET` | `/company/all` | HTTP 404 Not Found | Route does not exist on CRM router. Super Admin service optimized to call `/company` directly. | **NOT IMPLEMENTED IN CRM** |
| 17 | `GET` | `/company/:id` | HTTP 404 Not Found | CRM instance treats `/company` as singular tenant profile. Super Admin falls back cleanly to `/company`. | **NOT IMPLEMENTED IN CRM** |
| 18 | `GET` | `/company/users` | HTTP 404 Not Found | CRM serves company users through `/auth/company-users/all`. Fully replaced in Super Admin. | **NOT IMPLEMENTED IN CRM** |
| 19 | `POST` | `/company/users` | HTTP 404 Not Found | CRM does not support external user creation via REST. Accounts must be invited via CRM tenant workspace. | **NOT IMPLEMENTED IN CRM** |
| 20 | `PUT` | `/company/users/:id` | HTTP 404 Not Found | CRM does not expose user profile mutation via Super Admin REST API. | **NOT IMPLEMENTED IN CRM** |
| 21 | `DELETE` | `/company/users/:id` | HTTP 404 Not Found | CRM does not support user deletion via REST. | **NOT IMPLEMENTED IN CRM** |
| 22 | `PATCH` | `/company/users/:id` | HTTP 404 Not Found | User suspension must be handled within CRM directly. | **NOT IMPLEMENTED IN CRM** |
| 23 | `GET` | `/company/profile` | HTTP 404 Not Found | Redundant legacy path. Profile data returned directly by `/company`. | **NOT IMPLEMENTED IN CRM** |
| 24 | `GET` | `/company/settings` | HTTP 404 Not Found | Company settings bundled inside `/company` payload. | **NOT IMPLEMENTED IN CRM** |
| 25 | `GET` | `/subscriptions` | HTTP 404 Not Found | CRM does not manage SaaS subscriptions; subscriptions are owned by Super Admin PostgreSQL database (`saas_subscriptions`). | **NOT IMPLEMENTED IN CRM** |
| 26 | `GET` | `/billing` | HTTP 404 Not Found | CRM does not manage SaaS billing; managed by Super Admin (`saas_payments`, `saas_invoices`). | **NOT IMPLEMENTED IN CRM** |

---

## 3. Discrepancies Between Documentation and Implementation

1. **Company Users vs Auth Company Users**:
   * *Documentation / Legacy Code Assumption*: `GET /company/users`, `POST /company/users`, `PUT /company/users/:id`.
   * *Actual Implementation*: Only `GET /auth/company-users/all` exists on the CRM server. Mutations (`POST`, `PUT`, `DELETE`, `PATCH`) return 404.
2. **Company Listing Path**:
   * *Documentation / Legacy Code Assumption*: `GET /company/all`.
   * *Actual Implementation*: Returns 404. The true endpoint is `GET /company`.
3. **Identifier Types**:
   * *Documentation / Legacy Code Assumption*: All CRM IDs assumed to be 32-bit Integers (`INTEGER` in PostgreSQL).
   * *Actual Implementation*: User IDs, Project IDs, and Manager IDs in NexFlow CRM are 36-character UUID strings (e.g. `a205f7bd-84b6-4b88-ba3b-abcb85f67422`).
