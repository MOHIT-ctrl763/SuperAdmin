/**
 * CRM Integration API Service for Super Admin Frontend
 * Calls Super Admin backend routes at /api/super-admin/crm/*
 */

import { api } from './api';

export const crmApi = {
  // Check CRM reachability, latency, and session status
  getStatus: () => api.get('/crm/status'),

  // Dynamic Live Endpoint Coverage Audit
  getEndpointsCoverage: () => api.get('/crm/endpoints-coverage'),

  // Connect or re-authenticate with CRM
  connect: (data) => api.post('/crm/connect', data),

  // Disconnect active CRM session
  disconnect: () => api.post('/crm/disconnect', {}),

  // Companies Management
  getCompanies: (params = {}) => api.get('/crm/companies', params),
  getCompanyById: (id) => api.get(`/crm/companies/${id}`),
  createCompany: (data) => api.post('/crm/companies', data),
  updateCompany: (id, data) => api.put(`/crm/companies/${id}`, data),
  resetCompanyPassword: (id, data) => api.post(`/crm/companies/${id}/reset-password`, data),

  // Company Users Management
  getUsers: (params = {}) => api.get('/crm/users', params),
  getUserById: (id) => api.get(`/crm/users/${id}`),
  createUser: (data) => api.post('/crm/users', data),
  updateUser: (id, data) => api.put(`/crm/users/${id}`, data),
  deleteUser: (id) => api.delete(`/crm/users/${id}`),
  toggleUserStatus: (id, isActive) => api.patch(`/crm/users/${id}/toggle-status`, { isActive }),

  // Branches Management
  getBranches: (params = {}) => api.get('/crm/branches', params),
  getBranchStats: () => api.get('/crm/branches/stats'),
  getBranchById: (id) => api.get(`/crm/branches/${id}`),
  getBranchUsers: (id) => api.get(`/crm/branches/${id}/users`),
  createBranch: (data) => api.post('/crm/branches', data),
  updateBranch: (id, data) => api.put(`/crm/branches/${id}`, data),
  toggleBranchStatus: (id) => api.patch(`/crm/branches/${id}/toggle-status`, {}),
  deleteBranch: (id) => api.delete(`/crm/branches/${id}`),

  // Positions, Teams & Roles
  getPositions: () => api.get('/crm/positions'),
  getTeams: () => api.get('/crm/teams'),
  getRoles: () => api.get('/crm/roles'),
  getRoleStats: () => api.get('/crm/roles/stats'),

  // Link Super Admin SaaS Organization to CRM Company
  syncOrganization: (orgId, crmCompanyId) => api.post(`/crm/sync-organization/${orgId}`, { crmCompanyId }),

  // CRM Leads & Pipeline
  getLeads: (params = {}) => api.get('/crm/leads', params),
  getLeadStats: () => api.get('/crm/leads/stats'),
  getLeadById: (id) => api.get(`/crm/leads/${id}`),

  // Pipeline Stages & Configuration
  getPipelineStages: () => api.get('/crm/pipeline-stages'),
  getStageFields: (stageId) => api.get(`/crm/pipeline-stages/${stageId}/fields`),
  getCustomFields: () => api.get('/crm/custom-fields'),
  getIndustryTemplates: () => api.get('/crm/industry-templates'),

  // Lead Capture Forms
  getLeadCaptureForms: () => api.get('/crm/lead-capture/forms'),
  getFormSubmissions: (formId) => api.get(`/crm/lead-capture/forms/${formId}/submissions`),

  // WhatsApp & Bot
  getWhatsAppChats: () => api.get('/crm/whatsapp/chats'),
  getWhatsAppStats: () => api.get('/crm/whatsapp/stats'),
  getWhatsAppChatMessages: (chatId) => api.get(`/crm/whatsapp/chats/${chatId}/messages`),
  getWhatsAppTemplates: () => api.get('/crm/whatsapp/templates'),
  getWhatsAppQuickReplies: () => api.get('/crm/whatsapp/quick-replies'),
  getBotSettings: () => api.get('/crm/bot/settings'),

  // Workflows & Projects
  getWorkflows: () => api.get('/crm/workflows'),
  getProjects: (params = {}) => api.get('/crm/projects', params),
  getProjectById: (id) => api.get(`/crm/projects/${id}`),
  getProjectInventory: (projectId) => api.get(`/crm/projects/${projectId}/inventory`),
  getProjectTasks: (projectId) => api.get(`/crm/projects/${projectId}/tasks`),

  // Quotations & Revenue
  getQuotations: (params = {}) => api.get('/crm/quotations', params),
  getQuotationStats: () => api.get('/crm/quotations/stats'),
  getQuotationTemplates: () => api.get('/crm/quotations/templates'),
  getQuotationById: (id) => api.get(`/crm/quotations/${id}`),

  // Calls & Telephony
  getCalls: (params = {}) => api.get('/crm/calls', params),
  getCallStats: () => api.get('/crm/calls/stats'),
  getScheduledCalls: () => api.get('/crm/calls/scheduled'),

  // Marketing Campaigns
  getCampaigns: () => api.get('/crm/campaigns'),
  getCampaignById: (id) => api.get(`/crm/campaigns/${id}`),

  // CRM Activity Feed & Reports
  getActivities: (params = {}) => api.get('/crm/activities', params),
  getReportsSummary: () => api.get('/crm/reports/summary'),
  getIntegrations: () => api.get('/crm/integrations'),
};
