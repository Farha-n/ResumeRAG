# ResumeRAG Deployment Guide

## Quick Deployment Options

### Option 1: Railway (Recommended - Free)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `Farha-n/ResumeRAG` repository
5. Railway will automatically detect Node.js and deploy
6. Your app will be available at `https://your-app-name.railway.app`

### Option 2: Render (Free Tier)
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Use these settings:
   - **Build Command**: `npm install && cd client && npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
6. Deploy and get your public URL

### Option 3: Vercel (Free Tier)
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your `Farha-n/ResumeRAG` repository
4. Vercel will auto-detect the configuration
5. Deploy and get your public URL

### Option 4: Netlify (Free Tier)
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub
3. Click "New site from Git"
4. Connect your repository
5. Use these settings:
   - **Build Command**: `npm install && cd client && npm install && npm run build`
   - **Publish Directory**: `client/build`
   - **Functions Directory**: `api` (for serverless functions)

## Local Development with Public URL

### Using ngrok (if installed)
```bash
# Install ngrok
npm install -g ngrok

# Start your local server
npm start

# In another terminal, create public tunnel
ngrok http 8000
```

### Using localtunnel (Alternative)
```bash
# Install localtunnel
npm install -g localtunnel

# Start your local server
npm start

# In another terminal, create public tunnel
lt --port 8000 --subdomain resumerag
```

## Environment Variables

For production deployment, you may need to set:
- `NODE_ENV=production`
- `PORT=8000` (or let the platform assign)
- `JWT_SECRET=your-secret-key` (for production)

## Database

The app uses SQLite which works well for:
- Railway: ✅ Works
- Render: ✅ Works  
- Vercel: ⚠️ Serverless (consider upgrading to PostgreSQL)
- Netlify: ⚠️ Serverless (consider upgrading to PostgreSQL)

## Quick Start Commands

```bash
# Clone the repository
git clone https://github.com/Farha-n/ResumeRAG.git
cd ResumeRAG

# Install dependencies
npm install

# Build the client
npm run build

# Start the server
npm start
```

## Test Credentials

- **Admin**: admin@resumerag.com / admin123
- **Recruiter**: recruiter@company.com / recruiter123  
- **User**: user@example.com / user123

## API Endpoints

- Health Check: `/api/health`
- API Documentation: `/api/_meta`
- Hackathon Manifest: `/.well-known/hackathon.json`
