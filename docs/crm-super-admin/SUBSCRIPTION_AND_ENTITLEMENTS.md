# SaaS Subscriptions, Plan Entitlements & Usage Enforcement

## 1. Overview
The SaaS Super Admin platform owns the entire subscription lifecycle, pricing tiers, payment reconciliation, and plan entitlements. This document describes how subscriptions map to CRM tenants and how feature limits are measured and enforced.

---

## 2. Subscription Lifecycle Architecture

### 2.1 State Machine
```
[TRIAL] ──(Upgrade)──> [ACTIVE] ──(Past Due)──> [GRACE_PERIOD]
   │                       │                          │
   │ (Expired)             │ (Scheduled Cancel)       │ (Unpaid)
   ▼                       ▼                          ▼
[EXPIRED]            [CANCEL_PENDING]           [SUSPENDED]
                           │                          ▲
                           │ (Period End)             │
                           └──────────────────────────┘
```

### 2.2 Lifecycle Automation Engine
* Running background service: `subscriptionAutomationService.js` (periodic 1-hour interval worker).
* **Automated Actions**:
  1. **Trial Expiration Check**: Transitions organizations with `trial_ends_at < NOW()` from `TRIAL` to `EXPIRED`.
  2. **Renewal Reminders**: Idempotent dispatch of 7-day and 3-day expiration alerts to tenant billing emails.
  3. **Scheduled Plan Changes**: Applies queued plan upgrades or downgrades (`scheduled_plan_id`) upon period end.
  4. **Immediate & Scheduled Cancellations**: Handles cancellations with structured reason tracking (`saas_subscription_churn_events`).

---

## 3. Plan Entitlements & Feature Quotas

| Entitlement / Quota | Basic Tier | Pro Tier | Enterprise Tier | CRM Measurement | Enforcement Mechanism |
|---------------------|------------|----------|-----------------|-----------------|-----------------------|
| **Active Users** | 5 Users | 25 Users | 100+ Users | `GET /auth/company-users/all` | Super Admin UI & Gateway |
| **Branch Offices** | 1 Branch | 5 Branches | Unlimited | `GET /branches/stats` | Super Admin UI |
| **Sales Leads** | 500 Leads | 10,000 Leads | Unlimited | `GET /leads/stats` | Super Admin Display |
| **Projects & Units**| 3 Projects | 25 Projects | Unlimited | `GET /projects` | Super Admin Display |
| **WhatsApp Bots** | Disabled | Aria Standard | Custom Persona | `GET /ai-agent/settings` | CRM Bot Master Toggle |
| **Workflows** | 2 Flows | 10 Flows | Unlimited | `GET /workflows` | CRM Workflows Engine |
| **Storage (GB)** | 10 GB | 50 GB | 500 GB | `saas_usage_metrics` | Super Admin Quota Service |

### Important Note on CRM Subscription Enforcement
The CRM backend does not currently evaluate a tenant's subscription status on incoming API requests (e.g., it does not automatically return HTTP 402 Payment Required if a Super Admin subscription is cancelled or expired).
* **Super Admin Enforcement**: When an organization is suspended in Super Admin (`status = 'SUSPENDED'`), the Super Admin gateway blocks user impersonation and alerts administrators.
* **CRM Recommendation**: To achieve automatic access blocking inside the CRM tenant workspace upon subscription expiration, a tenant middleware hook checking tenant subscription status should be introduced in a future authorized CRM update.
