const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');
const { checkIdempotency } = require('../middleware/idempotency');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hackathon-secret-key';

// Register endpoint
router.post('/register', checkIdempotency, (req, res) => {
  const { email, password, name, role = 'user' } = req.body;

  // Validation
  if (!email || !password || !name) {
    return res.status(400).json({
      error: {
        code: 'FIELD_REQUIRED',
        field: !email ? 'email' : !password ? 'password' : 'name',
        message: `${!email ? 'Email' : !password ? 'Password' : 'Name'} is required`
      }
    });
  }

  if (!['user', 'recruiter', 'admin'].includes(role)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_ROLE',
        message: 'Role must be user, recruiter, or admin'
      }
    });
  }

  // Check if user already exists
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database error'
        }
      });
    }

    if (row) {
      return res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists'
        }
      });
    }

    // Hash password and create user
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, role],
      function(err) {
        if (err) {
          return res.status(500).json({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to create user'
            }
          });
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: this.lastID, email, role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.status(201).json({
          user: {
            id: this.lastID,
            email,
            name,
            role
          },
          token
        });
      }
    );
  });
});

// Login endpoint
router.post('/login', checkIdempotency, (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: 'FIELD_REQUIRED',
        field: !email ? 'email' : 'password',
        message: `${!email ? 'Email' : 'Password'} is required`
      }
    });
  }

  // Find user
  db.get(
    'SELECT id, email, password, name, role FROM users WHERE email = ?',
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Database error'
          }
        });
      }

      if (!user) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }

      // Verify password
      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      });
    }
  );
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token required'
      }
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }
    req.user = user;
    next();
  });
}

module.exports = router;
module.exports.authenticateToken = authenticateToken;
