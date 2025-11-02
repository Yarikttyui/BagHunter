const jwt = require('jsonwebtoken');

const authHeaderRegex = /^Bearer\s+(.+)$/i;

function extractToken(req) {
  const { authorization } = req.headers;
  if (!authorization) {
    return null;
  }

  const match = authorization.match(authHeaderRegex);
  if (!match) {
    return null;
  }

  return match[1];
}

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/reset-password'
];

function authenticate(req, res, next) {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const path = req.path || '';
  if (PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath))) {
    return next();
  }

  try {
    const rawToken = extractToken(req);
    if (!rawToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(
      rawToken,
      process.env.JWT_SECRET || 'change-me'
    );

    req.user = decoded;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireRole
};
