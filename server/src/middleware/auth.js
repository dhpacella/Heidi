const jwt = require('jsonwebtoken');
const logger = require('../lib/logger');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    jwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function requireSession(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.redirect('/login');
}

function requireApiAuth(req, res, next) {
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      email: req.session.email,
      role: req.session.role
    };
    return next();
  }

  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const decoded = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
      req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
      return next();
    } catch (err) {
      logger.warn('Auth failed: invalid token', { requestId: req.id, path: req.path, message: err.message });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  logger.warn('Auth failed: missing token', { requestId: req.id, path: req.path });
  res.status(401).json({ error: 'Authentication required' });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { signToken, requireSession, requireApiAuth, requireRole };
