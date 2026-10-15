# PROJECT STATUS & ARCHITECTURAL REPORT
**Project Name:** SaaS SuperAdmin & Multi-Tenant Management Platform  
**Target Integration:** NexFlow CRM & Multi-Tenant OrderFlow OMS  
**Prepared For:** Engineering Leadership & Management  
**Date:** October 2026  
**Document Version:** 1.0 (Final Architecture & Functional Report)

---

## 1. Executive Summary

The **SaaS SuperAdmin Platform** is a centralized, high-performance administrative and governance suite designed to manage multi-tenant SaaS accounts, subscription lifecycles, global system configurations, security policies, and external CRM operations.

This platform bridges internal administrative controls with the **NexFlow CRM REST API**, providing a single unified dashboard for managing organizations, client provisioning, automated billing, granular role-based access control (RBAC), and compliance auditing.

### Key Business & Technical Goals Achieved:
1. **Centralized Multi-Tenancy:** Streamlined tenant onboarding, plan assignments, quota enforcement, and company lifecycle control (Active, Suspended, Archived).
2. **Comprehensive Subscription & Billing Lifecycle:** End-to-end plan management, recurring billing cadence, trial expirations, scheduled plan changes, churn analytics, and payment tracking.
3. **Hybrid CRM Integration:** Two-way sync engine that bridges SuperAdmin actions with the external NexFlow CRM API while maintaining a local PostgreSQL ledger for zero downtime resilience.
4. **Enterprise-Grade Security & Governance:** Granular RBAC (19+ modules), JWT authentication, Bcrypt password hashing, and immutable audit trails for complete compliance.

---

## 2. System Architecture & Tech Stack

```
+--------------------------------------------------------------------------+
|                            CLIENT FRONTEND                               |
|       React 18  |  Vite 6  |  Tailwind CSS  |  Lucide Icons              |
|       (Role-Based UI Guards, Real-time Alerts, Dynamic Dashboards)       |
+------------------------------------+-------------------------------------+
                                     | HTTP / REST (JWT Bearer Token)
                                     v
+--------------------------------------------------------------------------+
|                         NODE.JS / EXPRESS BACKEND                        |
|                                                                          |
|  +--------------------+  +--------------------+  +--------------------+  |
|  | Auth & Security    |  | Subscription Engine|  | CRM Integration    |  |
|  | (JWT, RBAC Guards) |  | (Billing, Trials)  |  | (API Proxy & Sync) |  |
|  +--------------------+  +--------------------+  +--------------------+  |
|  +--------------------+  +--------------------+  +--------------------+  |
|  | Audit Logger       |  | Organization Mgmt  |  | SMTP Notification  |  |
|  | (Compliance Trail) |  | (Tenants, Quotas)  |  | (Gmail SSL/TLS)    |  |
|  +--------------------+  +--------------------+  +--------------------+  |
+-------------------+-----------------------------------+------------------+
                    |                                   |
         SQL Queries| (Parameterized)         REST APIs | (Sync & Forward)
                    v                                   v
+-----------------------------------+   +----------------------------------+
|     POSTGRESQL DATABASE           |   |       EXTERNAL CRM API           |
|     (superadmin_db)               |   |       (NexFlow CRM Engine)       |
|                                   |   |                                  |
| - users & roles                   |   | - Remote Companies               |
| - organizations & quotas          |   | - Remote Contacts & Leads        |
| - saas_subscriptions & invoices   |   | - Deals & Pipelines              |
| - saas_plans & saas_features      |   | - Activity Timelines             |
| - crm_companies (local ledger)    |   |                                  |
| - audit_logs & notifications      |   |                                  |
+-----------------------------------+   +----------------------------------+
```

### Technology Breakdown

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + Vite 6 | Lightning-fast build and reactive state management |
| **Styling & UI** | Tailwind CSS + Lucide Icons | Responsive modern UI with consistent color tokens |
| **Backend Runtime** | Node.js (v20+) | Event-driven, asynchronous backend execution |
| **Web Framework** | Express 4.21 | Modular RESTful API architecture |
| **Database** | PostgreSQL 16 (`superadmin_db`) | ACID-compliant relational data store with parameterized queries |
| **Security Layer** | JWT + Bcrypt.js + CORS | Stateless token authorization and encrypted credentials |
| **Email Service** | Nodemailer (SMTP SSL/TLS) | Transactional notifications and alert routing |
| **Upstream CRM** | NexFlow CRM REST API | Third-party CRM integration for enterprise accounts |

---

## 3. Core Modules & Key Features

### 3.1 Organization & Tenant Management
- **Tenant Provisioning:** Instant creation of client accounts with customizable subdomains, contact details, user quotas, and storage tiers.
- **Status Lifecycle:** Immediate suspension or reactivation of tenants based on compliance or billing events.
- **Resource Limits:** Enforces user counts, monthly order volume quotas, and storage allocations.

### 3.2 Subscription & Billing Engine
- **Flexible Plans:** Supports Monthly and Annual billing cycles with custom pricing tiers (Basic, Pro, Enterprise).
- **Automated Lifecycle Transitions:**
  - Active $\rightarrow$ Grace Period $\rightarrow$ Suspended $\rightarrow$ Cancelled.
  - Trial Period auto-expiration and notification dispatch.
- **Scheduled Upgrades & Downgrades:** Plan changes can apply immediately (with proration logic) or defer to the next billing cycle.
- **Invoicing & Payments:** Invoice generation, payment method recording (Credit Card, Bank Transfer, Stripe, Razorpay), and coupon discount redemption.
- **Churn Analytics:** Real-time visibility into MRR (Monthly Recurring Revenue), ARR, churn rate percentage, and cancellation categorization.

### 3.3 CRM Integration (Hybrid Architecture)
- **Two-Way Synchronization:** Combines local SuperAdmin company records with live upstream NexFlow CRM data.
- **Resilient Fallback Ledger:** When creating a company, the request is forwarded to the CRM API. Regardless of remote upstream availability, the record is immediately committed to the local `crm_companies` ledger with a `crm_synced` status flag, ensuring zero data loss.
- **Unified Views:** Merges contacts, companies, pipelines, deals, and activities into a single view.

### 3.4 Role-Based Access Control (RBAC) & Governance
- **19 Granular Modules:** Defined permissions across Organizations, Subscriptions, Users, Roles, Billing, Analytics, CRM, Audit Logs, and Settings.
- **Default Roles:** Super Admin (unrestricted), Billing Admin, Support Representative, Compliance Auditor.
- **Dynamic Permission Assignment:** Permissions can be assigned and modified per role without code modifications.

### 3.5 Security & Audit Logging
- **Immutable Audit Trail:** Every sensitive administrative action (plan change, user suspension, role update, cancellation) is logged with admin ID, action name, IP address, timestamp, and metadata payload.
- **SQL Injection Prevention:** 100% of database interactions utilize parameterized `$1, $2` prepared statements.

---

## 4. Database Schema Overview

The database contains purpose-built tables optimized for performance and referential integrity:

| Table Name | Purpose | Key Attributes |
| :--- | :--- | :--- |
| **`users`** | SuperAdmin staff accounts | `id`, `name`, `email`, `password_hash`, `role_id`, `status` |
| **`roles` & `permissions`** | RBAC matrix | `name`, `module`, `action`, `code` |
| **`organizations`** | Tenant client accounts | `name`, `slug`, `domain`, `plan`, `max_users`, `status` |
| **`saas_plans`** | Configurable pricing plans | `name`, `monthly_price`, `yearly_price`, `features` |
| **`saas_subscriptions`** | Active billing contracts | `organization_id`, `plan_id`, `amount`, `status`, `current_period_end` |
| **`saas_invoices`** | Billing records | `invoice_number`, `amount`, `currency`, `status`, `due_date` |
| **`saas_payments`** | Transaction logs | `payment_id`, `method`, `amount`, `status` |
| **`saas_coupons`** | Promotional engine | `code`, `discount_type`, `discount_value`, `max_uses` |
| **`crm_companies`** | Local CRM ledger | `name`, `email`, `gstin`, `state`, `crm_synced` |
| **`audit_logs`** | Security audit history | `admin_id`, `action`, `module`, `details`, `created_at` |

---

## 5. API Architecture & Endpoints

The backend exposes structured REST endpoints under `/api/super-admin`:

- **Auth:** `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
- **Organizations:** `GET /organizations`, `POST /organizations`, `GET /organizations/:id`, `PATCH /organizations/:id/status`
- **Subscriptions:** `GET /subscriptions`, `POST /subscriptions`, `POST /subscriptions/:id/change-plan`, `POST /subscriptions/:id/cancel`, `GET /subscriptions/churn-analytics`
- **Plans & Features:** `GET /plans`, `POST /plans`, `GET /features`, `POST /features`
- **CRM Sync:** `GET /crm/companies`, `POST /crm/companies`, `GET /crm/contacts`, `GET /crm/deals`, `GET /crm/stats`
- **Billing & Coupons:** `GET /billing/invoices`, `GET /billing/payments`, `POST /coupons`
- **RBAC & Users:** `GET /roles`, `POST /roles`, `GET /permissions`, `GET /users`, `POST /users`
- **System & Auditing:** `GET /audit`, `GET /dashboard/metrics`, `GET /analytics/subscriptions`

---

## 6. Recent Enhancements & Cleanups

1. **Production Data Sanitization:**
   - Cleared obsolete mock/seed test subscriptions from previous testing iterations.
   - Retained valid production subscription records (`ajay` - Basic Plan, Active).
   - Updated `database.js` initialization seeds to prevent re-seeding unwanted dummy data.
2. **CRM Hybrid Ledger Implementation:**
   - Implemented error-tolerant company creation so downstream operations remain unaffected even during upstream API latency.
3. **Automated Lifecycle Cron Services:**
   - Integrated automated trial expiration and renewal tracking service (`subscriptionAutomationService.js`).

---

## 7. How to Run Locally

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (running locally or remote connection)

### Steps
1. **Start Backend Server:**
   ```bash
   cd backend
   npm install
   npm run dev
   # Runs on http://localhost:5000
   ```
2. **Start Frontend Server:**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Runs on http://localhost:5174
   ```

---

## 8. Conclusion & Next Steps

The platform is in a **feature-complete, fully functional state** across all core requirements:
- Multi-tenant tenant control is operative.
- Subscription provisioning and automated calculations are validated.
- Upstream CRM integration is resilient with zero data loss.
- UI/UX is responsive, intuitive, and shielded by RBAC.

**Recommended Future Roadmap:**
- Enable webhook listeners for real-time upstream CRM event notifications.
- Integrate direct Razorpay/Stripe payment gateway checkout links for tenant self-service renewals.
- Add Automated PDF generation for customer invoices.
