const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('./auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required'
      }
    });
  }
  next();
};

// Get all users
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  db.all(
    'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limitNum, offsetNum],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch users'
          }
        });
      }

      // Get total count
      db.get('SELECT COUNT(*) as total FROM users', (err, countRow) => {
        if (err) {
          console.error('Count error:', err);
          return res.status(500).json({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to get user count'
            }
          });
        }

        const total = countRow.total;
        const nextOffset = offsetNum + limitNum < total ? offsetNum + limitNum : null;

        res.json({
          items: rows.map(row => ({
            id: row.id,
            email: row.email,
            name: row.name,
            role: row.role,
            created_at: row.created_at
          })),
          next_offset: nextOffset,
          total
        });
      });
    }
  );
});

// Create new user
router.post('/users', authenticateToken, requireAdmin, (req, res) => {
  const { name, email, password, role = 'user' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: {
        code: 'FIELD_REQUIRED',
        field: !name ? 'name' : !email ? 'email' : 'password',
        message: `${!name ? 'Name' : !email ? 'Email' : 'Password'} is required`
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

  // Check if email already exists
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, existingUser) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database error'
        }
      });
    }

    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already exists'
        }
      });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user
    db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to create user'
            }
          });
        }

        res.status(201).json({
          id: this.lastID,
          name,
          email,
          role,
          created_at: new Date().toISOString(),
          message: 'User created successfully'
        });
      }
    );
  });
});

// Update user
router.patch('/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;

  // Check if user exists
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database error'
        }
      });
    }

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, id], (err, existingUser) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Database error'
            }
          });
        }

        if (existingUser) {
          return res.status(409).json({
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Email already exists'
            }
          });
        }

        updateUser();
      });
    } else {
      updateUser();
    }

    function updateUser() {
      const updates = [];
      const values = [];

      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (email) {
        updates.push('email = ?');
        values.push(email);
      }
      if (role && ['user', 'recruiter', 'admin'].includes(role)) {
        updates.push('role = ?');
        values.push(role);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: {
            code: 'NO_UPDATES',
            message: 'No valid updates provided'
          }
        });
      }

      values.push(id);

      db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update user'
              }
            });
          }

          res.json({
            id: parseInt(id),
            message: 'User updated successfully'
          });
        }
      );
    }
  });
});

// Delete user
router.delete('/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // Prevent deleting self
  if (parseInt(id) === req.user.userId) {
    return res.status(400).json({
      error: {
        code: 'CANNOT_DELETE_SELF',
        message: 'Cannot delete your own account'
      }
    });
  }

  // Check if user exists
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database error'
        }
      });
    }

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Delete user
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete user'
          }
        });
      }

      res.json({
        message: 'User deleted successfully'
      });
    });
  });
});

// Get system statistics
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
  const stats = {};

  // Get user count
  db.get('SELECT COUNT(*) as total FROM users', (err, userCount) => {
    if (err) {
      console.error('User count error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user statistics'
        }
      });
    }

    stats.totalUsers = userCount.total;

    // Get resume count
    db.get('SELECT COUNT(*) as total FROM resumes', (err, resumeCount) => {
      if (err) {
        console.error('Resume count error:', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get resume statistics'
          }
        });
      }

      stats.totalResumes = resumeCount.total;

      // Get job count
      db.get('SELECT COUNT(*) as total FROM jobs', (err, jobCount) => {
        if (err) {
          console.error('Job count error:', err);
          return res.status(500).json({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to get job statistics'
            }
          });
        }

        stats.totalJobs = jobCount.total;

        // Get application count
        db.get('SELECT COUNT(*) as total FROM applications', (err, applicationCount) => {
          if (err) {
            console.error('Application count error:', err);
            return res.status(500).json({
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get application statistics'
              }
            });
          }

          stats.totalApplications = applicationCount.total;

          // Get application status breakdown
          db.all('SELECT status, COUNT(*) as count FROM applications GROUP BY status', (err, statusBreakdown) => {
            if (err) {
              console.error('Status breakdown error:', err);
              return res.status(500).json({
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'Failed to get application status breakdown'
                }
              });
            }

            stats.applicationStatus = statusBreakdown.reduce((acc, row) => {
              acc[row.status] = row.count;
              return acc;
            }, {});

            res.json(stats);
          });
        });
      });
    });
  });
});

module.exports = router;
