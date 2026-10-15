# Organization & User Management Integration

## 1. Overview
The SaaS Super Admin platform manages subscription accounts (`organizations`), while NexFlow CRM manages multi-tenant companies (`companies`) and users (`users`). This document defines how organizations, users, branches, and roles integrate across system boundaries.

---

## 2. Organization to CRM Company Linkage

### 2.1 Schema Mapping
* **Super Admin `organizations` table**:
  * `id`: SERIAL Primary Key
  * `name`: Legal tenant name
  * `slug`: Subdomain / identifier
  * `plan_id`: Assigned SaaS subscription plan
  * `crm_company_id`: VARCHAR(100) — Links to CRM Company UUID or Tenant Key.
* **CRM `companies` table**:
  * `id`: UUID Primary Key (`gen_random_uuid()`)
  * `name`, `address`, `gstin`, `pan`, `stateCode`, `logo`
  * `invoice_prefix`, `bank_name`, `bank_account`, `bank_ifsc`

### 2.2 Organization Synchronization Workflow
1. An administrator views an organization in Super Admin at `/super-admin/organizations/:id`.
2. The UI checks if `crm_company_id` is populated.
3. If linked, a badge displays `CRM Linked: <UUID>` and direct shortcuts allow viewing tenant CRM leads, branches, and users.
4. If unlinked, administrators can link the tenant via `POST /api/super-admin/crm/sync-organization/:id`.

---

## 3. User Management Across Tenants

### 3.1 Cross-Tenant User Discovery
* **Endpoint**: `GET /api/v1/auth/company-users/all`
* **Access Level**: Super Admin only.
* **Payload Structure**:
  ```json
  [
    {
      "id": "e24218c7-7f84-4ff8-b082-f4dace04f181",
      "name": "AASIB",
      "email": "aasibkhan155471@gmail.com",
      "role": "super_admin",
      "branch": null,
      "companyId": null,
      "managerId": null,
      "team": null,
      "isActive": true,
      "roleDetails": {
        "description": "Full system access",
        "permissions": []
      }
    }
  ]
  ```

### 3.2 Single User Details & Mutations
* `GET /api/v1/auth/company-user/:id`: Retrieves full user profile, assigned branch, reporting manager UUID, and granular permission overrides.
* `POST /api/v1/auth/company-user/create`: Provisions an employee user under a company.
* `PATCH /api/v1/auth/company-user/update/:id`: Updates name, phone, branchId, managerId, and team.
* `PATCH /api/v1/auth/company-user/:id/active`: Toggles `isActive: true/false`.
* `PATCH /api/v1/auth/company-user/:id/permissions`: Overrides granular permission flags.
* `DELETE /api/v1/auth/company-user/delete/:id`: Removes user record from CRM.

---

## 4. Branch Offices & Geographic Modeling
* **Endpoint**: `GET /api/v1/branches/get-all`
* **Live Verified Branches**:
  1. `DEL01` — Delhi Branch (New Delhi)
  2. `DEL59` — Delhi Branch MG (MG Road)
  3. `MUM01` — Mumbai HQ (Andheri East, 4 assigned users)
  4. `PUN01` — Pune Office (Hinjewadi, 3 assigned users)
* **Branch Users**: `GET /api/v1/branches/users/:id` maps employees to physical sales offices.
