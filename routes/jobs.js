const express = require('express');
const natural = require('natural');
const { db } = require('../database/init');
const { authenticateToken } = require('./auth');
const { checkIdempotency } = require('../middleware/idempotency');

const router = express.Router();

// Create job posting
router.post('/', authenticateToken, checkIdempotency, (req, res) => {
  const { title, description, requirements, company, location, salary_range } = req.body;

  // Validation
  if (!title || !description) {
    return res.status(400).json({
      error: {
        code: 'FIELD_REQUIRED',
        field: !title ? 'title' : 'description',
        message: `${!title ? 'Title' : 'Description'} is required`
      }
    });
  }

  // Only recruiters and admins can create jobs
  if (!['recruiter', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only recruiters and admins can create job postings'
      }
    });
  }

  db.run(
    `INSERT INTO jobs (title, description, requirements, company, location, salary_range, created_by) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, description, requirements || '', company || '', location || '', salary_range || '', req.user.userId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create job posting'
          }
        });
      }

      res.status(201).json({
        id: this.lastID,
        title,
        description,
        requirements,
        company,
        location,
        salary_range,
        created_by: req.user.userId,
        created_at: new Date().toISOString()
      });
    }
  );
});

// Get jobs with pagination and filtering
router.get('/', authenticateToken, (req, res) => {
  const { limit = 10, offset = 0, company, location } = req.query;
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  let query = `
    SELECT j.*, u.name as created_by_name
    FROM jobs j
    JOIN users u ON j.created_by = u.id
    WHERE 1=1
  `;
  
  let params = [];
  
  // Add filters
  if (company) {
    query += ' AND j.company LIKE ?';
    params.push(`%${company}%`);
  }
  
  if (location) {
    query += ' AND j.location LIKE ?';
    params.push(`%${location}%`);
  }
  
  query += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offsetNum);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch jobs'
        }
      });
    }

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM jobs j WHERE 1=1';
    let countParams = [];
    
    if (company) {
      countQuery += ' AND j.company LIKE ?';
      countParams.push(`%${company}%`);
    }
    
    if (location) {
      countQuery += ' AND j.location LIKE ?';
      countParams.push(`%${location}%`);
    }

    db.get(countQuery, countParams, (err, countRow) => {
      if (err) {
        console.error('Count error:', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get job count'
          }
        });
      }

      const total = countRow.total;
      const nextOffset = offsetNum + limitNum < total ? offsetNum + limitNum : null;

      res.json({
        items: rows.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description,
          requirements: row.requirements,
          company: row.company,
          location: row.location,
          salary_range: row.salary_range,
          created_by: row.created_by_name,
          created_at: row.created_at
        })),
        next_offset: nextOffset,
        total
      });
    });
  });
});

// Get specific job
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT j.*, u.name as created_by_name
     FROM jobs j
     JOIN users u ON j.created_by = u.id
     WHERE j.id = ?`,
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch job'
          }
        });
      }

      if (!row) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found'
          }
        });
      }

      res.json({
        id: row.id,
        title: row.title,
        description: row.description,
        requirements: row.requirements,
        company: row.company,
        location: row.location,
        salary_range: row.salary_range,
        created_by: row.created_by_name,
        created_at: row.created_at
      });
    }
  );
});

// Match resumes to job
router.post('/:id/match', authenticateToken, checkIdempotency, (req, res) => {
  const { id } = req.params;
  const { top_n = 5 } = req.body;

  // Only recruiters and admins can match
  if (!['recruiter', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only recruiters and admins can match resumes to jobs'
      }
    });
  }

  const topN = Math.min(parseInt(top_n), 20); // Limit to 20 matches max

  // Get job details
  db.get('SELECT * FROM jobs WHERE id = ?', [id], (err, job) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch job'
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

    // Get all resumes
    db.all(
      `SELECT r.id, r.original_name, r.content, r.parsed_data, u.name as uploader_name
       FROM resumes r
       JOIN users u ON r.user_id = u.id`,
      (err, resumes) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to fetch resumes'
            }
          });
        }

        // Calculate matches
        const matches = resumes.map(resume => {
          const jobText = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
          const resumeText = resume.content.toLowerCase();
          
          // Simple keyword matching
          const jobKeywords = jobText.split(' ').filter(w => w.length > 3);
          const resumeKeywords = resumeText.split(' ').filter(w => w.length > 3);
          
          const matchingKeywords = jobKeywords.filter(keyword => 
            resumeKeywords.some(resumeKeyword => 
              resumeKeyword.includes(keyword) || keyword.includes(resumeKeyword)
            )
          );
          
          const matchScore = matchingKeywords.length / jobKeywords.length;
          
          // Extract evidence
          const evidence = matchingKeywords.slice(0, 5);
          
          // Find missing requirements
          const missingRequirements = jobKeywords.filter(keyword => 
            !resumeKeywords.some(resumeKeyword => 
              resumeKeyword.includes(keyword) || keyword.includes(resumeKeyword)
            )
          ).slice(0, 5);

          return {
            resume_id: resume.id,
            filename: resume.original_name,
            uploader: resume.uploader_name,
            match_score: Math.round(matchScore * 100) / 100,
            evidence: evidence,
            missing_requirements: missingRequirements,
            recommendation: matchScore > 0.3 ? 'strong' : matchScore > 0.1 ? 'moderate' : 'weak'
          };
        })
        .filter(match => match.match_score > 0)
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, topN);

        // Store matches in database
        const matchPromises = matches.map(match => {
          return new Promise((resolve, reject) => {
            db.run(
              `INSERT OR REPLACE INTO job_matches 
               (job_id, resume_id, match_score, evidence, missing_requirements) 
               VALUES (?, ?, ?, ?, ?)`,
              [
                id,
                match.resume_id,
                match.match_score,
                JSON.stringify(match.evidence),
                JSON.stringify(match.missing_requirements)
              ],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });

        Promise.all(matchPromises)
          .then(() => {
            res.json({
              job_id: parseInt(id),
              job_title: job.title,
              matches,
              total_matches: matches.length,
              matched_at: new Date().toISOString()
            });
          })
          .catch(err => {
            console.error('Failed to store matches:', err);
            // Still return results even if storage fails
            res.json({
              job_id: parseInt(id),
              job_title: job.title,
              matches,
              total_matches: matches.length,
              matched_at: new Date().toISOString()
            });
          });
      }
    );
  });
});

// Get job match history
router.get('/:id/matches', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { limit = 10, offset = 0 } = req.query;
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  // Only recruiters and admins can view matches
  if (!['recruiter', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only recruiters and admins can view job matches'
      }
    });
  }

  db.all(
    `SELECT jm.*, r.original_name, u.name as uploader_name
     FROM job_matches jm
     JOIN resumes r ON jm.resume_id = r.id
     JOIN users u ON r.user_id = u.id
     WHERE jm.job_id = ?
     ORDER BY jm.match_score DESC
     LIMIT ? OFFSET ?`,
    [id, limitNum, offsetNum],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch job matches'
          }
        });
      }

      res.json({
        items: rows.map(row => ({
          id: row.id,
          resume_id: row.resume_id,
          filename: row.original_name,
          uploader: row.uploader_name,
          match_score: row.match_score,
          evidence: JSON.parse(row.evidence || '[]'),
          missing_requirements: JSON.parse(row.missing_requirements || '[]'),
          matched_at: row.created_at
        })),
        next_offset: offsetNum + limitNum,
        total: rows.length
      });
    }
  );
});

// Update job posting
router.patch('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Only recruiters and admins can update jobs
  if (!['recruiter', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only recruiters and admins can update job postings'
      }
    });
  }

  // Check if job exists and user has permission
  db.get('SELECT * FROM jobs WHERE id = ?', [id], (err, job) => {
    if (err) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch job'
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

    // Check if user created this job or is admin
    if (job.created_by !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update jobs you created'
        }
      });
    }

    // Build update query
    const allowedFields = ['title', 'description', 'requirements', 'company', 'location', 'salary_range'];
    const updateFields = [];
    const values = [];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_UPDATES',
          message: 'No valid fields to update'
        }
      });
    }

    values.push(id);

    db.run(
      `UPDATE jobs SET ${updateFields.join(', ')} WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to update job'
            }
          });
        }

        res.json({
          id: parseInt(id),
          message: 'Job updated successfully',
          updated_fields: updateFields.map(field => field.split(' = ')[0])
        });
      }
    );
  });
});

module.exports = router;
