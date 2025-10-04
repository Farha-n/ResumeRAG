# ResumeRAG - Resume Search & Job Match Webapp

A comprehensive web application for uploading, parsing, and searching resumes with AI-powered job matching capabilities.

## 🚀 Features

- **Resume Upload**: Support for PDF, DOCX, DOC, and TXT files
- **AI-Powered Search**: Semantic search through resume content with snippet evidence
- **Job Matching**: Intelligent matching of resumes to job postings with evidence and missing requirements
- **Role-Based Access**: User, Recruiter, and Admin roles with appropriate permissions
- **PII Protection**: Automatic redaction of personal information for non-recruiters
- **Rate Limiting**: 60 requests per minute per user
- **Idempotency**: Support for idempotency keys on all POST requests
- **Pagination**: Efficient pagination for all list endpoints

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js, SQLite
- **Frontend**: React, Tailwind CSS, React Router
- **File Processing**: PDF parsing, DOCX extraction
- **Search**: Natural language processing with TF-IDF
- **Authentication**: JWT tokens
- **Deployment**: Vercel-ready

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Resumes
- `POST /api/resumes` - Upload resume (multipart)
- `GET /api/resumes` - List resumes with pagination and search
- `GET /api/resumes/:id` - Get specific resume
- `DELETE /api/resumes/:id` - Delete resume

### Jobs
- `POST /api/jobs` - Create job posting (recruiters only)
- `GET /api/jobs` - List jobs with filtering
- `GET /api/jobs/:id` - Get specific job
- `PATCH /api/jobs/:id` - Update job posting
- `POST /api/jobs/:id/match` - Match resumes to job
- `GET /api/jobs/:id/matches` - Get job match history

### Search
- `POST /api/ask` - Search resumes with natural language queries
- `GET /api/ask/history` - Get search history
- `GET /api/ask/stats` - Get search statistics (admin only)

### System
- `GET /api/health` - Health check
- `GET /api/_meta` - API metadata
- `GET /.well-known/hackathon.json` - Hackathon manifest

## 🔑 Test Credentials

### Admin User
- **Email**: admin@resumerag.com
- **Password**: admin123
- **Role**: admin
- **Permissions**: Full access to all features

### Recruiter User
- **Email**: recruiter@company.com
- **Password**: recruiter123
- **Role**: recruiter
- **Permissions**: Can create jobs, view full resume details, match candidates

### Regular User
- **Email**: user@example.com
- **Password**: user123
- **Role**: user
- **Permissions**: Can upload resumes, search, view own resumes

## 📝 Example API Requests

### Register User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "user"
  }'
```

### Upload Resume
```bash
curl -X POST http://localhost:8000/api/resumes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "resume=@resume.pdf"
```

### Search Resumes
```bash
curl -X POST http://localhost:8000/api/ask \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find candidates with Python experience",
    "k": 5
  }'
```

### Create Job
```bash
curl -X POST http://localhost:8000/api/jobs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Software Engineer",
    "description": "We are looking for a senior software engineer...",
    "requirements": "5+ years experience with JavaScript, React, Node.js",
    "company": "TechCorp Inc.",
    "location": "San Francisco, CA",
    "salary_range": "$120,000 - $150,000"
  }'
```

### Match Resumes to Job
```bash
curl -X POST http://localhost:8000/api/jobs/1/match \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "top_n": 10
  }'
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd resumerag-hackathon
```

2. **Install dependencies**
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

3. **Start the development server**
```bash
# Start backend server
npm run dev

# In another terminal, start frontend
cd client
npm start
```

4. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Health Check: http://localhost:8000/api/health

## 📊 Pagination

All list endpoints support pagination with `limit` and `offset` parameters:

```bash
GET /api/resumes?limit=10&offset=0
```

Response format:
```json
{
  "items": [...],
  "next_offset": 10,
  "total": 25
}
```

## 🔄 Idempotency

All POST endpoints support idempotency keys:

```bash
curl -X POST http://localhost:8000/api/resumes \
  -H "Idempotency-Key: unique-key-123" \
  -F "resume=@resume.pdf"
```

## ⚡ Rate Limiting

- **Limit**: 60 requests per minute per IP
- **Response**: 429 status code when exceeded
- **Headers**: Standard rate limit headers included

## 🔒 Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "FIELD_REQUIRED",
    "field": "email",
    "message": "Email is required"
  }
}
```

## 🏗 Architecture

### Backend Architecture
- **Express.js** server with middleware for CORS, rate limiting, and authentication
- **SQLite** database for data persistence
- **JWT** for authentication and authorization
- **Multer** for file upload handling
- **Natural** library for text processing and search

### Frontend Architecture
- **React** with functional components and hooks
- **React Router** for client-side routing
- **Tailwind CSS** for styling
- **Axios** for API communication
- **React Dropzone** for file uploads

### Key Features Implementation
- **File Processing**: PDF parsing with pdf-parse, DOCX with mammoth
- **Search Engine**: TF-IDF based similarity scoring
- **Job Matching**: Keyword-based matching with evidence extraction
- **PII Redaction**: Simple regex-based redaction for privacy
- **Role-Based Access**: JWT-based authorization with role checks

## 🧪 Testing the Application

1. **Login** with test credentials
2. **Upload** sample resumes (PDF/DOCX files)
3. **Search** for candidates using natural language queries
4. **Create** job postings (as recruiter)
5. **Match** resumes to jobs and view evidence
6. **Test** pagination, rate limiting, and error handling

## 📈 Performance Considerations

- **File Size Limit**: 10MB per upload
- **Search Caching**: Query results cached for 60 seconds
- **Database Indexing**: Indexes on frequently queried fields
- **Rate Limiting**: Prevents abuse and ensures fair usage

## 🔧 Configuration

Environment variables (create `.env` file):
```
PORT=8000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

## 📱 Deployment

The application is ready for deployment on Vercel:

1. **Build the frontend**:
```bash
cd client
npm run build
```

2. **Deploy to Vercel**:
```bash
vercel --prod
```

## 🎯 Hackathon Compliance

✅ **API Correctness**: All required endpoints implemented  
✅ **Pagination**: Supported on all list endpoints  
✅ **Idempotency**: Idempotency-Key header support  
✅ **Rate Limiting**: 60 req/min enforced  
✅ **Error Format**: Consistent error response structure  
✅ **CORS**: Open during judging  
✅ **Authentication**: JWT-based auth with role management  
✅ **UI**: Complete React frontend exercising all APIs  
✅ **Documentation**: Comprehensive API docs and examples  

## 🤝 Contributing

This is a hackathon project. For production use, consider:
- Adding comprehensive test coverage
- Implementing proper vector embeddings for search
- Adding more sophisticated PII detection
- Implementing proper logging and monitoring
- Adding database migrations
- Implementing proper error tracking

## 📄 License

This project is created for hackathon purposes.
