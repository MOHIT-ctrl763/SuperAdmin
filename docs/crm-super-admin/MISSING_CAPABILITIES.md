# Missing CRM Capabilities, Backend Blockers & Recommendations

## Overview
During the empirical runtime audit of the NexFlow CRM Backend (`https://api.nexflowcrm.com/api/v1`), several issues and missing capabilities were identified. In accordance with the project rules, **zero modifications were made to the CRM backend**. This document catalogs all blockers, root causes, Super Admin workarounds, and recommended CRM-side fixes for future authorized maintenance.

---

## 1. CRM Backend Blockers (HTTP 500 Errors)

### Issue 1.1: Role Controller SQL Type Mismatch (`operator does not exist: integer = uuid`)
* **Impacted Endpoints**:
  * `GET /api/v1/role/get-all` (Returns 500)
  * `GET /api/v1/role/stats` (Returns 500)
  * `GET /api/v1/role/get-by-id/:id` (Returns 500)
* **Root Cause in CRM**: The CRM SQL query in `role-controller.js` compares an `INTEGER` column or variable against a `UUID` column (or joins `users.role` with `roles.id` where one is UUID and the other is integer) without explicit type casting.
* **Super Admin Workaround**: Handled gracefully in `crmApiService.js`. Super Admin intercepts the 500 response, flags `crmBlocker: true`, and informs the administrator via UI without crashing.
* **Recommended CRM Fix**: In CRM `src/role/role-controller.js`, add explicit type casting:
  ```sql
  -- Change:
  WHERE roles.id = users.role_id
  -- To:
  WHERE roles.id::text = users.role_id::text
  ```

---

## 2. Unmounted CRM Routes (HTTP 404 Errors)

### Issue 2.1: Dashboard Analytics Router Not Mounted in CRM Server
* **Impacted Endpoints**:
  * `GET /api/v1/dashboard/summary`
  * `GET /api/v1/dashboard/sales-trend`
  * `GET /api/v1/dashboard/low-stock`
  * `GET /api/v1/dashboard/top-items`
* **Root Cause in CRM**: As noted in Finding 1 of the CRM backend analysis report, `dashboard-routes.js` is fully implemented in the CRM source tree, but the CRM `server.js` file omitted `app.use('/api/v1/dashboard', dashboardRouter);`.
* **Super Admin Workaround**: Super Admin utilizes the working `GET /api/v1/reports/summary` endpoint for CRM high-level counters and maps other metrics from `/leads/stats`, `/branches/stats`, and `/quotations/stats`.
* **Recommended CRM Fix**: Add the following to CRM `server.js`:
  ```javascript
  import dashboardRouter from "./src/dashboard/dashboard-routes.js";
  app.use("/api/v1/dashboard", dashboardRouter);
  ```

### Issue 2.2: AI Sales Bot Prefix Mount Point
* **Impacted Endpoint**: `GET /api/v1/bot/settings` (Returns 404)
* **Root Cause in CRM**: The route is mounted under `/api/v1/ai-agent/settings` rather than `/api/v1/bot/settings`.
* **Super Admin Workaround**: Super Admin automatically queries `/ai-agent/settings` first and falls back to `/bot/settings`.

---

## 3. Configuration & Deployment Recommendations

### Issue 3.1: Super Admin Domain in CRM CORS Whitelist
* **Current State**: CRM `allowedOrigins` in `server.js` includes `localhost:3000`, `3001`, `3002`, `5173`. If Super Admin runs on port 5174 or a custom production subdomain (e.g. `https://admin.nexflowcrm.com`), direct browser calls are blocked by CORS.
* **Super Admin Solution**: Super Admin routes all CRM interactions through its own backend server (`http://localhost:5000/api/super-admin/crm/*`), completely bypassing browser CORS restrictions.
* **Recommended CRM Fix**: Add production admin origin to CRM `server.js` `allowedOrigins` array for consistency.

### Issue 3.2: AI Bot LLM Keys in CRM `.env`
* **Current State**: The WhatsApp AI Sales bot operates in safe fallback mode because `LLM_PROVIDER` and `LLM_API_KEY` are not configured in the CRM `.env`.
* **Recommended CRM Fix**: When generative replies are needed, configure Gemini or OpenAI keys in the CRM backend environment.
