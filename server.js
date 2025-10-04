const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  message: {
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'src/client/build')));

// Import routes
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resumes');
const jobRoutes = require('./routes/jobs');
const searchRoutes = require('./routes/search');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/ask', searchRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Meta endpoint
app.get('/api/_meta', (req, res) => {
  res.json({
    name: 'ResumeRAG API',
    version: '1.0.0',
    description: 'Resume Search & Job Match API',
    endpoints: {
      auth: '/api/auth',
      resumes: '/api/resumes',
      jobs: '/api/jobs',
      search: '/api/ask'
    }
  });
});

// Hackathon manifest
app.get('/.well-known/hackathon.json', (req, res) => {
  res.json({
    name: 'ResumeRAG',
    description: 'Resume Search & Job Match Webapp',
    version: '1.0.0',
    problem_statement: 1,
    features: [
      'Resume upload and parsing',
      'Vector search with embeddings',
      'Job matching with evidence',
      'Role-based access control',
      'Pagination and rate limiting',
      'Idempotency support'
    ],
    tech_stack: ['Node.js', 'Express', 'SQLite', 'React', 'Natural Language Processing'],
    deployment: 'Vercel'
  });
});

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/client/build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong!'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
