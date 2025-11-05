const stripTrailingSlash = (value, fallback) => {
  const source = value || fallback;
  if (!source) {
    return null;
  }
  return source.trim().replace(/\/+$/, '');
};

const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((item) => stripTrailingSlash(item))
    .filter(Boolean);

const adminPanelUrl = stripTrailingSlash(
  process.env.ADMIN_PANEL_URL,
  'http://localhost:3000'
);
const clientPortalUrl = stripTrailingSlash(
  process.env.CLIENT_PORTAL_URL,
  'http://localhost:3001'
);
const landingSiteUrl = stripTrailingSlash(
  process.env.LANDING_SITE_URL,
  'http://localhost:3002'
);
const apiPublicUrl = stripTrailingSlash(process.env.API_PUBLIC_URL, '');

const allowedOrigins = Array.from(
  new Set(
    [
      adminPanelUrl,
      clientPortalUrl,
      landingSiteUrl,
      ...parseOrigins(process.env.CORS_ORIGINS)
    ].filter(Boolean)
  )
);

module.exports = {
  stripTrailingSlash,
  parseOrigins,
  adminPanelUrl,
  clientPortalUrl,
  landingSiteUrl,
  apiPublicUrl,
  allowedOrigins
};
