/**
 * API Service Client for Super Admin Panel
 */

const BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '').replace(/\/+$/, '')}/api/super-admin`
  : '/api/super-admin';

export async function request(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;
  const token = localStorage.getItem('saas_super_admin_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    // If 401 Unauthorized, redirect to Super Admin login (except for external CRM bridge endpoints)
    if (response.status === 401 && !options.skipAuthRedirect && !cleanEndpoint.startsWith('/crm')) {
      if (!window.location.pathname.includes('/super-admin/login')) {
        localStorage.removeItem('saas_super_admin_token');
        localStorage.removeItem('saas_super_admin_user');
        window.location.href = '/super-admin/login?expired=1';
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      err.code = data.code;
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`[SuperAdmin API Error] ${options.method || 'GET'} ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  get: (endpoint, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`${endpoint}${queryString}`, { method: 'GET' });
  },

  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};
