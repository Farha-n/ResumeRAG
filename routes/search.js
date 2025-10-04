const express = require('express');
const natural = require('natural');
const { db } = require('../database/init');
const { authenticateToken } = require('./auth');
const { checkIdempotency } = require('../middleware/idempotency');

const router = express.Router();

// Simple text similarity calculation
const calculateSimilarity = (text1, text2) => {
  const tokenizer = new natural.WordTokenizer();
  const tokens1 = tokenizer.tokenize(text1.toLowerCase());
  const tokens2 = tokenizer.tokenize(text2.toLowerCase());
  
  // Remove stop words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  const filtered1 = tokens1.filter(token => token.length > 2 && !stopWords.has(token));
  const filtered2 = tokens2.filter(token => token.length > 2 && !stopWords.has(token));
  
  // Calculate Jaccard similarity
  const set1 = new Set(filtered1);
  const set2 = new Set(filtered2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
};

// Extract relevant snippets from text
const extractSnippets = (text, query, k = 3) => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
  
  const scoredSentences = sentences.map(sentence => {
    const sentenceWords = sentence.toLowerCase().split(' ');
    const matches = queryWords.filter(word => 
      sentenceWords.some(sw => sw.includes(word) || word.includes(sw))
    ).length;
    const score = matches / queryWords.length;
    return { sentence: sentence.trim(), score };
  });
  
  return scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(item => item.sentence)
    .filter(s => s.length > 0);
};

// Ask questions about resumes
router.post('/', authenticateToken, checkIdempotency, (req, res) => {
  const { query, k = 3 } = req.body;

  if (!query) {
    return res.status(400).json({
      error: {
        code: 'FIELD_REQUIRED',
        field: 'query',
        message: 'Query is required'
      }
    });
  }

  const kNum = Math.min(parseInt(k), 10); // Limit to 10 results max

  // Get all resumes (with role-based access)
  let resumeQuery = `
    SELECT r.id, r.original_name, r.content, r.parsed_data, u.name as uploader_name
    FROM resumes r
    JOIN users u ON r.user_id = u.id
  `;
  
  let params = [];
  
  if (req.user.role === 'user') {
    resumeQuery += ' WHERE r.user_id = ?';
    params.push(req.user.userId);
  }

  db.all(resumeQuery, params, (err, resumes) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search resumes'
        }
      });
    }

    // Calculate similarity scores and extract snippets
    const results = resumes.map(resume => {
      const similarity = calculateSimilarity(resume.content, query);
      const snippets = extractSnippets(resume.content, query, 2);
      
      return {
        resume_id: resume.id,
        filename: resume.original_name,
        uploader: resume.uploader_name,
        similarity_score: similarity,
        snippets: snippets,
        relevance: similarity > 0.1 ? 'high' : similarity > 0.05 ? 'medium' : 'low'
      };
    })
    .filter(result => result.similarity_score > 0.01) // Filter out very low relevance
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, kNum);

    // Store query in cache
    db.run(
      'INSERT INTO search_queries (query, results) VALUES (?, ?)',
      [query, JSON.stringify(results)],
      (err) => {
        if (err) {
          console.error('Failed to cache query:', err);
        }
      }
    );

    res.json({
      query,
      results,
      total_found: results.length,
      search_timestamp: new Date().toISOString()
    });
  });
});

// Get search history
router.get('/history', authenticateToken, (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  db.all(
    `SELECT query, results, created_at 
     FROM search_queries 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [limitNum, offsetNum],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch search history'
          }
        });
      }

      res.json({
        items: rows.map(row => ({
          query: row.query,
          results: JSON.parse(row.results || '[]'),
          searchedAt: row.created_at
        })),
        next_offset: offsetNum + limitNum,
        total: rows.length
      });
    }
  );
});

// Get search statistics
router.get('/stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required'
      }
    });
  }

  // Get total searches
  db.get('SELECT COUNT(*) as total_searches FROM search_queries', (err, searchCount) => {
    if (err) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get search stats'
        }
      });
    }

    // Get total resumes
    db.get('SELECT COUNT(*) as total_resumes FROM resumes', (err, resumeCount) => {
      if (err) {
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get resume stats'
          }
        });
      }

      // Get most common queries
      db.all(
        `SELECT query, COUNT(*) as frequency 
         FROM search_queries 
         GROUP BY query 
         ORDER BY frequency DESC 
         LIMIT 5`,
        (err, topQueries) => {
          if (err) {
            return res.status(500).json({
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get top queries'
              }
            });
          }

          res.json({
            total_searches: searchCount.total_searches,
            total_resumes: resumeCount.total_resumes,
            top_queries: topQueries,
            generated_at: new Date().toISOString()
          });
        }
      );
    });
  });
});

module.exports = router;
