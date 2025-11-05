const stripTrailingSlash = (url) =>
  typeof url === 'string' ? url.replace(/\/+$/, '') : '';

const apiOrigin =
  stripTrailingSlash(process.env.REACT_APP_API_ORIGIN) || 'http://localhost:5000';

const apiBaseUrl =
  stripTrailingSlash(process.env.REACT_APP_API_URL) || `${apiOrigin}/api`;

export const API_ORIGIN = apiOrigin;
export const API_BASE_URL = apiBaseUrl;
export const ADMIN_PANEL_URL =
  stripTrailingSlash(process.env.REACT_APP_ADMIN_PANEL_URL) || 'http://localhost:3000';
export const CLIENT_PORTAL_URL =
  stripTrailingSlash(process.env.REACT_APP_CLIENT_PORTAL_URL) || 'http://localhost:3001';
