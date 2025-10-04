# Deployment Guide - ResumeRAG

This guide will help you deploy the ResumeRAG application to Vercel for the hackathon.

## 🚀 Quick Deployment to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy the application**
```bash
vercel --prod
```

4. **Your app will be available at**: `https://your-app-name.vercel.app`

### Option 2: Deploy via Vercel Dashboard

1. **Push your code to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the configuration

3. **Deploy**
   - Click "Deploy"
   - Your app will be live in minutes

## 🔧 Configuration

The application is pre-configured for Vercel deployment with:

- **vercel.json**: Main configuration file
- **client/vercel.json**: Frontend build configuration
- **Environment variables**: Set in vercel.json

### Environment Variables

The following environment variables are configured:
- `JWT_SECRET`: Hackathon secret key
- `NODE_ENV`: Set to production

## 📱 Testing Your Deployment

After deployment, test these endpoints:

1. **Health Check**: `https://your-app.vercel.app/api/health`
2. **API Metadata**: `https://your-app.vercel.app/api/_meta`
3. **Hackathon Manifest**: `https://your-app.vercel.app/.well-known/hackathon.json`

## 🧪 Test the Full Application

1. **Visit your deployed URL**
2. **Register/Login** with test credentials:
   - Admin: admin@resumerag.com / admin123
   - Recruiter: recruiter@company.com / recruiter123
   - User: user@example.com / user123

3. **Test all features**:
   - Upload resumes
   - Search functionality
   - Job creation and matching
   - Pagination
   - Rate limiting

## 🐛 Troubleshooting

### Common Issues

1. **Build Fails**
   - Check that all dependencies are in package.json
   - Ensure Node.js version is 18+

2. **API Not Working**
   - Verify vercel.json routes are correct
   - Check environment variables

3. **Database Issues**
   - SQLite database is created automatically
   - Seed data is inserted on first run

### Debug Commands

```bash
# Check Vercel logs
vercel logs

# Check build logs
vercel logs --build

# Redeploy
vercel --prod --force
```

## 📊 Performance Optimization

For production deployment, consider:

1. **Database**: Upgrade to PostgreSQL for better performance
2. **File Storage**: Use AWS S3 or similar for file uploads
3. **Caching**: Implement Redis for search result caching
4. **CDN**: Use Vercel's CDN for static assets

## 🔒 Security Considerations

- Change JWT_SECRET in production
- Implement proper CORS policies
- Add input validation and sanitization
- Use HTTPS (automatic with Vercel)

## 📈 Monitoring

Vercel provides built-in monitoring:
- Function execution logs
- Performance metrics
- Error tracking
- Analytics

## 🎯 Hackathon Submission

Your deployment URL should be:
```
https://your-app-name.vercel.app
```

Make sure to test all required features before submission:
- ✅ Resume upload and parsing
- ✅ Search with evidence
- ✅ Job matching
- ✅ Pagination
- ✅ Rate limiting
- ✅ Authentication
- ✅ Role-based access

## 🆘 Support

If you encounter issues:
1. Check Vercel documentation
2. Review the application logs
3. Test locally first
4. Contact hackathon support

Good luck with your submission! 🚀
