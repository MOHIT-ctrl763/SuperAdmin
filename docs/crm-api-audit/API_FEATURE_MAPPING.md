# CRM API-to-Feature Mapping Matrix

This document provides a comprehensive mapping of every CRM API endpoint to its corresponding Super Admin frontend page, UI component, backend route, and service layer handler.

---

## 1. Authentication & Diagnostic Gateway

| CRM API Endpoint | Super Admin Backend Route | Super Admin Controller / Service | Super Admin Frontend Page / Component | Feature Description |
|------------------|---------------------------|----------------------------------|----------------------------------------|---------------------|
| `POST /auth/login` | `POST /api/super-admin/crm/connect` | `crmController.connect` / `crmApiService.login` | `CrmIntegrationPage.jsx` → Connect Modal | Authenticates Super Admin with CRM service credentials or bearer token. |
| `GET /auth/me` | `GET /api/super-admin/crm/status` | `crmController.getStatus` / `crmApiService.checkHealth` | `CrmIntegrationPage.jsx` → Real-Time Health & Diagnostics Card | Probes CRM reachability, round-trip latency (ms), and session validity. |
| Memory / DB Reset | `POST /api/super-admin/crm/disconnect` | `crmController.disconnect` / `crmApiService.setActiveToken(null)` | `CrmIntegrationPage.jsx` → Disconnect Session Button | Clears active CRM session token from memory and `system_settings` table. |

---

## 2. Organization & Tenant Management

| CRM API Endpoint | Super Admin Backend Route | Super Admin Controller / Service | Super Admin Frontend Page / Component | Feature Description |
|------------------|---------------------------|----------------------------------|----------------------------------------|---------------------|
| `GET /company` | `GET /api/super-admin/crm/companies` | `crmController.getCompanies` / `crmApiService.getCompanies` | `CrmIntegrationPage.jsx` → Companies Ledger Tab | Lists CRM company profile, tax GSTIN, email, and metadata. |
| `POST /company` | `POST /api/super-admin/crm/companies` | `crmController.createCompany` / `crmApiService.createCompany` | Backend Service Adapter | Provisions initial company profile on CRM engine. |
| `PUT /company` | `PUT /api/super-admin/crm/companies/:id` | `crmController.updateCompany` / `crmApiService.updateCompany` | Backend Service Adapter | Updates company profile settings on CRM. |
| Super Admin Internal Sync | `POST /api/super-admin/crm/sync-organization/:id` | `crmController.syncOrganization` | `CrmIntegrationPage.jsx` → Link to SaaS Tenant Modal | Links a Super Admin SaaS tenant (`organizations.id`) to a CRM Company ID (`organizations.crm_company_id`). |

---

## 3. CRM User Management

| CRM API Endpoint | Super Admin Backend Route | Super Admin Controller / Service | Super Admin Frontend Page / Component | Feature Description |
|------------------|---------------------------|----------------------------------|----------------------------------------|---------------------|
| `GET /auth/company-users/all` | `GET /api/super-admin/crm/users` | `crmController.getUsers` / `crmApiService.getCompanyUsers` | `CrmIntegrationPage.jsx` → Company Users Directory Tab | Displays all 7 registered CRM company users with role badges, status, and search. |
| `GET /company/users/:id` | `GET /api/super-admin/crm/users/:id` | `crmController.getUserById` / `crmApiService.getCompanyUserById` | `CrmIntegrationPage.jsx` → User Details Modal | Displays single user details, manager ID, team affiliation, and timestamps. |

---

## 4. CRM Business Modules & Operations

| CRM API Endpoint | Super Admin Backend Route | Super Admin Controller / Service | Super Admin Frontend Page / Component | Feature Description |
|------------------|---------------------------|----------------------------------|----------------------------------------|---------------------|
| `GET /leads` | `GET /api/super-admin/crm/leads` | `crmController.getLeads` / `crmApiService.getLeads` | `CrmIntegrationPage.jsx` → Leads & Pipeline Tab | Displays paginated CRM sales leads with company, stage, assigned agent, and score. |
| `GET /leads/stats` | `GET /api/super-admin/crm/leads/stats` | `crmController.getLeadStats` / `crmApiService.getLeadStats` | `CrmIntegrationPage.jsx` → Lead Conversion Metric Cards | Real-time breakdown of total leads, hot leads, warm leads, cold leads, and average score. |
| `GET /leads/:id` | `GET /api/super-admin/crm/leads/:id` | `crmController.getLeadById` / `crmApiService.getLeadById` | `CrmIntegrationPage.jsx` → Lead Details Modal | Displays full record, custom fields, and project linkage for a single lead. |
| `GET /activities` | `GET /api/super-admin/crm/activities` | `crmController.getActivities` / `crmApiService.getActivities` | `CrmIntegrationPage.jsx` → Live Activity Stream Tab | Live audit feed of 184 agent actions, form creations, lead stage transitions, and reminders. |
| `GET /projects` | `GET /api/super-admin/crm/projects` | `crmController.getProjects` / `crmApiService.getProjects` | `CrmIntegrationPage.jsx` → Projects Ledger Tab | Displays 8 active enterprise projects, inventory quotas, lead counts, and selling types. |
| `GET /projects/:id` | `GET /api/super-admin/crm/projects/:id` | `crmController.getProjectById` / `crmApiService.getProjectById` | `CrmIntegrationPage.jsx` → Project Details Modal | Detailed view of project parameters, documents, and inventory status. |
| `GET /whatsapp/templates` | `GET /api/super-admin/crm/whatsapp/templates` | `crmController.getWhatsAppTemplates` / `crmApiService.getWhatsAppTemplates` | `CrmIntegrationPage.jsx` → WhatsApp Templates Tab | Displays approved WhatsApp messaging templates with variable syntax and category. |
| `GET /teams` | `GET /api/super-admin/crm/teams` | `crmController.getTeams` / `crmApiService.getTeams` | Backend Service Proxy | Retrieves team structures configured inside the CRM. |
| `GET /integrations` | `GET /api/super-admin/crm/integrations` | `crmController.getIntegrations` / `crmApiService.getIntegrations` | Backend Service Proxy | Monitors third-party integrations (WhatsApp, email gateways, etc.). |

---

## 5. Domain Ownership Boundary Matrix

| Functional Area | Handled By Super Admin | Handled By CRM Backend | Synchronization Mechanism |
|-----------------|------------------------|------------------------|---------------------------|
| **SaaS Pricing & Plans** | Yes (`saas_plans`) | No | Super Admin owns all pricing tiers and quotas. |
| **SaaS Subscriptions** | Yes (`saas_subscriptions`) | No | Automated lifecycle worker in Super Admin. |
| **Billing & Invoices** | Yes (`saas_invoices`, `saas_payments`) | No | Super Admin manages payment gateways & PDF receipts. |
| **Platform Quotas** | Yes (`saas_usage_metrics`) | No | Enforced by Super Admin middleware. |
| **Tenant CRM Users** | Read-Only Directory | Authoritative Owner | Super Admin syncs directory via `GET /auth/company-users/all`. |
| **CRM Leads & Deals** | Analytics / Audit View | Authoritative Owner | Super Admin queries via `GET /leads` & `GET /leads/stats`. |
| **Customer Activities** | Read-Only Audit Feed | Authoritative Owner | Streamed via `GET /activities`. |
| **WhatsApp Campaigns** | Template Viewer | Authoritative Engine | Queried via `GET /whatsapp/templates`. |
