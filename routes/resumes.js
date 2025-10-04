const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const natural = require('natural');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken } = require('./auth');
const { checkIdempotency } = require('../middleware/idempotency');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed.'));
    }
  }
});

// Parse text from different file types
const parseFileContent = async (filePath, originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  
  try {
    switch (ext) {
      case '.pdf':
        const pdfData = await pdfParse(fs.readFileSync(filePath));
        return pdfData.text;
      
      case '.docx':
        const docxResult = await mammoth.extractRawText({ path: filePath });
        return docxResult.value;
      
      case '.doc':
        // For .doc files, we'll try to read as text (basic implementation)
        return fs.readFileSync(filePath, 'utf8');
      
      case '.txt':
        return fs.readFileSync(filePath, 'utf8');
      
      default:
        throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('Error parsing file:', error);
    throw new Error('Failed to parse file content');
  }
};

// Generate simple embeddings (TF-IDF based)
const generateEmbeddings = (text) => {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text.toLowerCase());
  
  // Remove stop words and short tokens
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  const filteredTokens = tokens.filter(token => 
    token.length > 2 && !stopWords.has(token)
  );
  
  // Simple TF-IDF calculation
  const termFreq = {};
  filteredTokens.forEach(token => {
    termFreq[token] = (termFreq[token] || 0) + 1;
  });
  
  // Normalize frequencies
  const totalTokens = filteredTokens.length;
  Object.keys(termFreq).forEach(term => {
    termFreq[term] = termFreq[term] / totalTokens;
  });
  
  return JSON.stringify(termFreq);
};

// Upload resume endpoint
router.post('/', authenticateToken, upload.single('resume'), checkIdempotency, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'FIELD_REQUIRED',
          field: 'resume',
          message: 'Resume file is required'
        }
      });
    }

    const { originalname, filename, path: filePath } = req.file;
    
    // Parse file content
    const content = await parseFileContent(filePath, originalname);
    
    // Generate embeddings
    const embeddings = generateEmbeddings(content);
    
    // Extract basic information from content
    const parsedData = {
      filename: originalname,
      content: content.substring(0, 1000), // Store first 1000 chars
      wordCount: content.split(' ').length,
      extractedAt: new Date().toISOString()
    };

    // Save to database
    db.run(
      `INSERT INTO resumes (user_id, filename, original_name, file_path, content, parsed_data, embeddings) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.userId, filename, originalname, filePath, content, JSON.stringify(parsedData), embeddings],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to save resume'
            }
          });
        }

        res.status(201).json({
          id: this.lastID,
          filename: originalname,
          content: content.substring(0, 200) + '...',
          wordCount: content.split(' ').length,
          uploadedAt: new Date().toISOString()
        });
      }
    );

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: error.message || 'Failed to process resume'
      }
    });
  }
});

// Get resumes with pagination and search
router.get('/', authenticateToken, (req, res) => {
  const { limit = 10, offset = 0, q = '' } = req.query;
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  let query = `
    SELECT r.id, r.original_name, r.parsed_data, r.created_at, u.name as uploader_name
    FROM resumes r
    JOIN users u ON r.user_id = u.id
  `;
  
  let params = [];
  
  // Add search filter
  if (q) {
    query += ` WHERE r.content LIKE ? OR r.original_name LIKE ?`;
    params.push(`%${q}%`, `%${q}%`);
  }
  
  // Add role-based filtering
  if (req.user.role === 'user') {
    query += q ? ' AND r.user_id = ?' : ' WHERE r.user_id = ?';
    params.push(req.user.userId);
  }
  
  query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limitNum, offsetNum);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch resumes'
        }
      });
    }

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM resumes r';
    let countParams = [];
    
    if (q) {
      countQuery += ' WHERE r.content LIKE ? OR r.original_name LIKE ?';
      countParams.push(`%${q}%`, `%${q}%`);
    }
    
    if (req.user.role === 'user') {
      countQuery += q ? ' AND r.user_id = ?' : ' WHERE r.user_id = ?';
      countParams.push(req.user.userId);
    }

    db.get(countQuery, countParams, (err, countRow) => {
      if (err) {
        console.error('Count error:', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get resume count'
          }
        });
      }

      const total = countRow.total;
      const nextOffset = offsetNum + limitNum < total ? offsetNum + limitNum : null;

      res.json({
        items: rows.map(row => ({
          id: row.id,
          filename: row.original_name,
          uploader: row.uploader_name,
          uploadedAt: row.created_at,
          parsedData: JSON.parse(row.parsed_data || '{}')
        })),
        next_offset: nextOffset,
        total
      });
    });
  });
});

// Get specific resume
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  let query = `
    SELECT r.*, u.name as uploader_name
    FROM resumes r
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `;
  
  let params = [id];
  
  // Add role-based access control
  if (req.user.role === 'user') {
    query += ' AND r.user_id = ?';
    params.push(req.user.userId);
  }

  db.get(query, params, (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch resume'
        }
      });
    }

    if (!row) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Resume not found'
        }
      });
    }

    // Redact PII for non-recruiters
    let content = row.content;
    if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
      // Simple PII redaction (email, phone, address patterns)
      content = content.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL REDACTED]');
      content = content.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE REDACTED]');
    }

    res.json({
      id: row.id,
      filename: row.original_name,
      content,
      uploader: row.uploader_name,
      uploadedAt: row.created_at,
      parsedData: JSON.parse(row.parsed_data || '{}'),
      embeddings: row.embeddings ? JSON.parse(row.embeddings) : null
    });
  });
});

// Delete resume
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  let query = 'SELECT * FROM resumes WHERE id = ?';
  let params = [id];
  
  // Add role-based access control
  if (req.user.role === 'user') {
    query += ' AND user_id = ?';
    params.push(req.user.userId);
  }

  db.get(query, params, (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch resume'
        }
      });
    }

    if (!row) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Resume not found'
        }
      });
    }

    // Delete file from filesystem
    try {
      if (fs.existsSync(row.file_path)) {
        fs.unlinkSync(row.file_path);
      }
    } catch (fileErr) {
      console.error('File deletion error:', fileErr);
    }

    // Delete from database
    db.run('DELETE FROM resumes WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete resume'
          }
        });
      }

      res.json({
        message: 'Resume deleted successfully',
        id: parseInt(id)
      });
    });
  });
});

module.exports = router;
