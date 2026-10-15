# NexFlow CRM & SaaS Super Admin System Architecture

## 1. Executive Summary & Communication Topology
The **SaaS Super Admin Platform** operates as an independent, multi-tenant administrative control center running on Node.js/Express with a dedicated PostgreSQL database (`superadmin_db`). It integrates seamlessly with the **NexFlow CRM Backend** (`https://api.nexflowcrm.com/api/v1` or local `http://localhost:7000/api/v1`) using a secure, server-side gateway pattern.

```mermaid
graph TB
    subgraph Browser ["Client Web Browser"]
        UI["Super Admin React SPA (Vite)"]
    end

    subgraph SuperAdminBackend ["Super Admin Backend (:5000)"]
        SAC_API["Express 4 REST Gateway"]
        AuthMiddleware["Super Admin Auth & RBAC"]
        CRMService["CrmApiService Proxy Engine"]
        SADatabase[(PostgreSQL superadmin_db)]
    end

    subgraph NexflowCRM ["NexFlow CRM Backend (:7000 or Cloud)"]
        CRM_API["Express 5 REST API Gateway"]
        CRMMiddleware["Auth & RBAC Middleware"]
        CRMModules["Leads, Workflows, WhatsApp, Projects, Calls"]
        CRMDatabase[(PostgreSQL IMSDATABASE)]
    end

    UI -->|JWT Bearer (Super Admin)| SAC_API
    SAC_API --> AuthMiddleware
    SAC_API --> SADatabase
    SAC_API --> CRMService
    CRMService -->|Server-Side Bearer Token (HTTPS)| CRM_API
    CRM_API --> CRMMiddleware
    CRMMiddleware --> CRMModules
    CRMModules --> CRMDatabase
```

---

## 2. Zero Mutation Rule & Boundary Principles
To preserve strict system integrity and avoid breaking production CRM workloads:
1. **Zero CRM Mutation**: The CRM backend codebase, routes, middleware, models, database tables, and `.env` files remain 100% unaltered.
2. **Server-Side Credentials Isolation**: CRM administrative tokens and master service credentials are never exposed to the client browser or stored in `localStorage`. All CRM interactions are proxied through `CrmApiService`.
3. **Dedicated Database Segregation**:
   * **Super Admin PostgreSQL (`superadmin_db`)**: Owns platform subscription tiers (`saas_plans`), billing cycles, invoices (`saas_invoices`), payments (`saas_payments`), platform audit trails (`audit_logs`), and tenant links (`organizations.crm_company_id`).
   * **CRM PostgreSQL (`IMSDATABASE`)**: Owns sales leads (`leads`), pipeline stages (`pipeline_stages`), custom fields, WhatsApp conversations (`whatsapp_chats`), telephony logs (`calls`), inventory units (`project_inventory`), and branch offices (`branches`).

---

## 3. Communication & Authentication Flow

### 3.1 Super Admin to CRM Authentication
* **Primary Auth**: JWT Bearer token passed in the `Authorization: Bearer <CRM_JWT>` HTTP header.
* **Storage**: Active CRM session tokens are securely persisted in `system_settings` table under key `crm_active_session_token`.
* **Automatic Session Recovery**: If the token expires or returns HTTP 401, `CrmApiService` attempts automatic re-authentication using configured `CRM_SERVICE_EMAIL` and `CRM_SERVICE_PASSWORD` before failing gracefully.
* **Timeout & Resilience**: All outbound HTTP requests to the CRM gateway enforce a strict 8000ms timeout using `AbortController` to prevent gateway thread exhaustion.

### 3.2 Dual Authentication in CRM
NexFlow CRM supports both Header-based Bearer JWT and HTTP-only cookies (`req.cookies.token`). Super Admin leverages standard Bearer token headers for deterministic server-to-server communication.

---

## 4. Tenant Mapping & Synchronization

Each tenant in Super Admin is stored in the `organizations` table. When an organization is linked to a CRM company:
1. `crm_company_id` (VARCHAR) stores the CRM company UUID or tenant key.
2. Super Admin administrators can inspect the organization's CRM users, branches, leads, and operational activities directly from the Organization Details page and CRM Integration portal.
3. Impersonation sessions allow Super Admin operators to launch single-sign-on sessions into the CRM tenant console via encrypted impersonation tokens.
