const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('./auth');
const { checkIdempotency } = require('../middleware/idempotency');

const router = express.Router();

// Apply for a job
router.post('/', authenticateToken, checkIdempotency, (req, res) => {
  const { job_id, resume_id, cover_letter = '' } = req.body;

  // Validation
  if (!job_id || !resume_id) {
    return res.status(400).json({
      error: {
        code: 'FIELD_REQUIRED',
        field: !job_id ? 'job_id' : 'resume_id',
        message: `${!job_id ? 'Job ID' : 'Resume ID'} is required`
      }
    });
  }

  // Check if user owns the resume
  db.get('SELECT * FROM resumes WHERE id = ? AND user_id = ?', [resume_id, req.user.userId], (err, resume) => {
    if (err) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database error'
        }
      });
    }

    if (!resume) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Resume not found or you do not own this resume'
        }
      });
    }

    // Check if job exists
    db.get('SELECT * FROM jobs WHERE id = ?', [job_id], (err, job) => {
      if (err) {
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Database error'
          }
        });
      }

      if (!job) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found'
          }
        });
      }

      // Check if already applied
      db.get('SELECT * FROM applications WHERE job_id = ? AND user_id = ?', [job_id, req.user.userId], (err, existing) => {
        if (err) {
          return res.status(500).json({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Database error'
            }
          });
        }

        if (existing) {
          return res.status(409).json({
            error: {
              code: 'ALREADY_APPLIED',
              message: 'You have already applied for this job'
            }
          });
        }

        // Create application
        db.run(
          'INSERT INTO applications (job_id, user_id, resume_id, cover_letter, status) VALUES (?, ?, ?, ?, ?)',
          [job_id, req.user.userId, resume_id, cover_letter, 'pending'],
          function(err) {
            if (err) {
              return res.status(500).json({
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'Failed to create application'
                }
              });
            }

            res.status(201).json({
              id: this.lastID,
              job_id: parseInt(job_id),
              resume_id: parseInt(resume_id),
              status: 'pending',
              applied_at: new Date().toISOString(),
              message: 'Application submitted successfully'
            });
          }
        );
      });
    });
  });
});

// Get applications (for recruiters and admins)
router.get('/', authenticateToken, (req, res) => {
  const { limit = 10, offset = 0, status, job_id } = req.query;
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  // Only recruiters and admins can view applications
  if (!['recruiter', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only recruiters and admins can view applications'
      }
    });
  }

  let query = `
    SELECT a.*, j.title as job_title, j.company, u.name as applicant_name, u.email as applicant_email,
           r.original_name as resume_filename
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN users u ON a.user_id = u.id
    JOIN resumes r ON a.resume_id = r.id
    WHERE 1=1
  `;
  
  let params = [];
  
  // Add filters
  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }
  
  if (job_id) {
    query += ' AND a.job_id = ?';
    params.push(job_id);
  }
  
  // If not admin, only show applications for jobs created by this recruiter
  if (req.user.role === 'recruiter') {
    query += ' AND j.created_by = ?';
    params.push(req.user.userId);
  }
  
  query += ' ORDER BY a.applied_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offsetNum);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch applications'
        }
      });
    }

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE 1=1
    `;
    let countParams = [];
    
    if (status) {
      countQuery += ' AND a.status = ?';
      countParams.push(status);
    }
    
    if (job_id) {
      countQuery += ' AND a.job_id = ?';
      countParams.push(job_id);
    }
    
    if (req.user.role === 'recruiter') {
      countQuery += ' AND j.created_by = ?';
      countParams.push(req.user.userId);
    }

    db.get(countQuery, countParams, (err, countRow) => {
      if (err) {
        console.error('Count error:', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get application count'
          }
        });
      }

      const total = countRow.total;
      const nextOffset = offsetNum + limitNum < total ? offsetNum + limitNum : null;

      res.json({
        items: rows.map(row => ({
          id: row.id,
          job_id: row.job_id,
          job_title: row.job_title,
          company: row.company,
          applicant_name: row.applicant_name,
          applicant_email: row.applicant_email,
          resume_filename: row.resume_filename,
          cover_letter: row.cover_letter,
          status: row.status,
          applied_at: row.applied_at,
          updated_at: row.updated_at
        })),
        next_offset: nextOffset,
        total
      });
    });
  });
});

// Get user's own applications
router.get('/my-applications', authenticateToken, (req, res) => {
  const { limit = 10, offset = 0, status } = req.query;
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  let query = `
    SELECT a.*, j.title as job_title, j.company, j.location, j.salary_range
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.user_id = ?
  `;
  
  let params = [req.user.userId];
  
  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY a.applied_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offsetNum);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch applications'
        }
      });
    }

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM applications WHERE user_id = ?';
    let countParams = [req.user.userId];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    db.get(countQuery, countParams, (err, countRow) => {
      if (err) {
        console.error('Count error:', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get application count'
          }
        });
      }

      const total = countRow.total;
      const nextOffset = offsetNum + limitNum < total ? offsetNum + limitNum : null;

      res.json({
        items: rows.map(row => ({
          id: row.id,
          job_id: row.job_id,
          job_title: row.job_title,
          company: row.company,
          location: row.location,
          salary_range: row.salary_range,
          cover_letter: row.cover_letter,
          status: row.status,
          applied_at: row.applied_at,
          updated_at: row.updated_at
        })),
        next_offset: nextOffset,
        total
      });
    });
  });
});

// Update application status (for recruiters and admins)
router.patch('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, notes = '' } = req.body;

  // Only recruiters and admins can update status
  if (!['recruiter', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only recruiters and admins can update application status'
      }
    });
  }

  if (!['pending', 'reviewing', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_STATUS',
        message: 'Status must be pending, reviewing, accepted, or rejected'
      }
    });
  }

  // Check if application exists and user has permission
  let query = `
    SELECT a.*, j.created_by 
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = ?
  `;
  
  let params = [id];
  
  // If not admin, only allow updating applications for jobs created by this recruiter
  if (req.user.role === 'recruiter') {
    query += ' AND j.created_by = ?';
    params.push(req.user.userId);
  }

  db.get(query, params, (err, application) => {
    if (err) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database error'
        }
      });
    }

    if (!application) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Application not found or you do not have permission to update it'
        }
      });
    }

    // Update application status
    db.run(
      'UPDATE applications SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, notes, id],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to update application status'
            }
          });
        }

        res.json({
          id: parseInt(id),
          status,
          notes,
          updated_at: new Date().toISOString(),
          message: 'Application status updated successfully'
        });
      }
    );
  });
});

// Get specific application details
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  let query = `
    SELECT a.*, j.title as job_title, j.company, j.description as job_description,
           u.name as applicant_name, u.email as applicant_email,
           r.original_name as resume_filename, r.content as resume_content
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN users u ON a.user_id = u.id
    JOIN resumes r ON a.resume_id = r.id
    WHERE a.id = ?
  `;
  
  let params = [id];

  db.get(query, params, (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch application'
        }
      });
    }

    if (!row) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Application not found'
        }
      });
    }

    // Check permissions
    const canView = req.user.role === 'admin' || 
                   req.user.role === 'recruiter' || 
                   row.user_id === req.user.userId;

    if (!canView) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this application'
        }
      });
    }

    res.json({
      id: row.id,
      job_id: row.job_id,
      job_title: row.job_title,
      company: row.company,
      job_description: row.job_description,
      applicant_name: row.applicant_name,
      applicant_email: row.applicant_email,
      resume_filename: row.resume_filename,
      resume_content: row.resume_content,
      cover_letter: row.cover_letter,
      status: row.status,
      notes: row.notes,
      applied_at: row.applied_at,
      updated_at: row.updated_at
    });
  });
});

module.exports = router;


