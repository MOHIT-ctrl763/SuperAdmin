# Security & Access Control Architecture

## 1. Authentication Mechanisms

### 1.1 Super Admin User Authentication
* **Protocol**: JWT (JSON Web Token) with HMAC SHA-256 (`jsonwebtoken ^9`).
* **Header**: `Authorization: Bearer <super_admin_jwt>`
* **Expiry**: 7 days (configurable via `JWT_EXPIRES_IN`).
* **Passwords**: Hashed with bcrypt (cost factor 10, salted).

### 1.2 CRM Service Authentication
* **Protocol**: Dual Authentication (Bearer JWT Header and HTTP-Only Cookie).
* **Storage**: In `superadmin_db` table `system_settings` under key `crm_active_session_token`.
* **Zero Client Exposure**: The Super Admin client browser never receives or stores the raw CRM service token. All requests to CRM endpoints are routed through the secure Super Admin backend proxy (`/api/super-admin/crm/*`).

---

## 2. Role-Based Access Control (RBAC)

Super Admin features and CRM proxy routes are guarded by granular permission checks:
* `organizations.view`, `organizations.create`, `organizations.update`, `organizations.delete`
* `users.view`, `users.create`, `users.update`, `users.delete`, `users.suspend`
* `plans.view`, `plans.create`, `plans.update`
* `subscriptions.view`, `subscriptions.update`
* `billing.view` (invoices, payments)
* `settings.view`, `settings.update`
* `dashboard.view`
* `auditLogs.view`

### Middleware Hierarchy
```
Request ──> authenticateSuperAdmin (validates Super Admin JWT)
           ──> requirePermission('...') (evaluates permissions JSON)
           ──> Controller Handler
```

---

## 3. Tenant Isolation & Data Protection
1. **Zero Tenant Cross-Contamination**: Each Super Admin organization query filters by `organization_id`.
2. **CORS Policy**: Configured in `backend/server.js` to allow verified origins with credentials support.
3. **Audit Logging**: All administrative actions (plan upgrades, tenant suspension, role changes, CRM connections) are logged to `audit_logs` with the acting administrator's user ID, timestamp, and IP address.
4. **Secret Sanitization**: Error messages returned to the client browser strip raw SQL error messages, stack traces, and internal database connection strings.
