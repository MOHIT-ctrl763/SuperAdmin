# Missing Integrations & Technical Limitations

This document analyzes CRM APIs that were previously missing from the Super Admin project, along with features requested by SaaS management workflows where corresponding CRM APIs do not exist.

---

## 1. CRM APIs Previously Missing (Now Integrated)

During this audit, we identified several functional CRM endpoints that existed on the CRM server but had zero integration into the Super Admin console. These have now been integrated into the Super Admin backend and frontend:

| API Endpoint | HTTP Method | Data Provided | Original Status | New Status | Integration Implementation |
|--------------|-------------|---------------|-----------------|------------|----------------------------|
| `/leads` | `GET` | Paginated CRM sales leads with scores, stages, custom fields, and project links | Available But Unintegrated | **FULLY INTEGRATED AND VERIFIED** | Proxy route `/api/super-admin/crm/leads` + `CrmIntegrationPage.jsx` Leads Tab |
| `/leads/stats` | `GET` | Aggregate lead conversion metrics, hot/warm/cold counts, average lead scores | Available But Unintegrated | **FULLY INTEGRATED AND VERIFIED** | Proxy route `/api/super-admin/crm/leads/stats` + Pipeline KPI Cards |
| `/leads/:id` | `GET` | Granular lead record with extra fields, timestamps, and assigned agent details | Available But Unintegrated | **FULLY INTEGRATED AND VERIFIED** | Proxy route `/api/super-admin/crm/leads/:id` + Lead Detail Modal |
| `/activities` | `GET` | 184 operational CRM event logs (form creations, calls, status changes) | Available But Unintegrated | **FULLY INTEGRATED AND VERIFIED** | Proxy route `/api/super-admin/crm/activities` + Live Activity Feed Tab |
| `/projects` | `GET` | 8 enterprise service lines and commercial projects with inventory counts | Available But Unintegrated | **FULLY INTEGRATED AND VERIFIED** | Proxy route `/api/super-admin/crm/projects` + Projects Ledger Tab |
| `/projects/:id` | `GET` | Single project parameters, category, and budget configurations | Available But Unintegrated | **FULLY INTEGRATED AND VERIFIED** | Proxy route `/api/super-admin/crm/projects/:id` + Project Details Modal |
| `/whatsapp/templates` | `GET` | 5 approved WhatsApp messaging templates (marketing & utility) | Available But Unintegrated | **FULLY INTEGRATED AND VERIFIED** | Proxy route `/api/super-admin/crm/whatsapp/templates` + WhatsApp Templates Tab |
| `/teams` | `GET` | CRM team definitions and leadership group hierarchies | Available But Unintegrated | **FULLY INTEGRATED AND VERIFIED** | Proxy route `/api/super-admin/crm/teams` |
| `/integrations` | `GET` | Registered external integrations in CRM engine | Available But Unintegrated | **FULLY INTEGRATED AND VERIFIED** | Proxy route `/api/super-admin/crm/integrations` |

---

## 2. Requested Features Where CRM Endpoints Do Not Exist

In accordance with Critical Rule #1 ("NEVER modify the CRM backend") and Rule #6 ("Do not invent API endpoints"), the following features cannot be performed remotely via the CRM REST API because the CRM backend does not provide matching endpoints:

### A. Remote CRM User Creation (`POST /company/users`)
* **Feature Requirement**: Provision a new CRM agent account directly from the Super Admin console.
* **CRM Status**: `404 Not Found` (`Cannot POST /api/v1/company/users`).
* **Technical Limitation**: The CRM engine does not expose user registration or provisioning to external API clients. User onboarding is restricted to internal workspace invitations.
* **Super Admin Handling**: The Super Admin displays a clear informative badge ("Managed in CRM") and prevents failed mutation requests.

### B. Remote CRM User Deactivation & Deletion (`DELETE / PATCH /company/users/:id`)
* **Feature Requirement**: Suspend or delete a CRM user account from Super Admin.
* **CRM Status**: `404 Not Found` (`Cannot PATCH /api/v1/company/users/:id`).
* **Technical Limitation**: Access control and seat allocation are managed internally within the CRM's own tenant admin panel.
* **Super Admin Handling**: Super Admin provides read-only inspection of active/inactive status without exposing broken deactivation buttons.

### C. Multi-Company Listing (`GET /company/all` or `GET /company/:id`)
* **Feature Requirement**: List arbitrary tenant companies by ID.
* **CRM Status**: `404 Not Found` (`Cannot GET /api/v1/company/all`, `Cannot GET /api/v1/company/1`).
* **Technical Limitation**: The connected CRM instance is scoped to a single tenant company profile accessible via `GET /company`.
* **Super Admin Handling**: The Super Admin queries `GET /company` directly without attempting non-existent `/company/all` routes.

### D. CRM Billing & Subscription Endpoints (`GET /subscriptions`, `GET /billing`, `GET /invoices`)
* **Feature Requirement**: Query CRM for customer billing, recurring subscriptions, and invoices.
* **CRM Status**: `404 Not Found` on all paths.
* **Technical Limitation**: The CRM backend has no knowledge of SaaS subscriptions or pricing tiers.
* **Super Admin Handling**: Handled 100% natively by the Super Admin PostgreSQL database (`saas_subscriptions`, `saas_invoices`, `saas_payments`). The CRM is not expected or required to handle billing.
