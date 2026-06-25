const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mini-attendance-secret-key-12345';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Token format is usually: Bearer <token>
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// Middleware to check if user has admin privileges
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  JWT_SECRET
};
