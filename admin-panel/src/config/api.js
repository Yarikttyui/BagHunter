const stripTrailingSlash = (url) =>
  typeof url === 'string' ? url.replace(/\/+$/, '') : '';

const apiOrigin =
  stripTrailingSlash(process.env.REACT_APP_API_ORIGIN) || 'http://localhost:5000';

const apiBaseUrl =
  stripTrailingSlash(process.env.REACT_APP_API_URL) || `${apiOrigin}/api`;

const socketUrl =
  stripTrailingSlash(process.env.REACT_APP_SOCKET_URL) || apiOrigin;

const assetOrigin =
  stripTrailingSlash(process.env.REACT_APP_ASSET_ORIGIN) || apiOrigin;

export const API_ORIGIN = apiOrigin;
export const API_BASE_URL = apiBaseUrl;
export const SOCKET_URL = socketUrl;
export const ASSET_BASE_URL = assetOrigin;
