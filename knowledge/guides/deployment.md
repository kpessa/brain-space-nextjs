# Brain Space Deployment Guide

This guide covers deploying Brain Space to production using Vercel, the recommended platform for Next.js applications.

## Pre-Deployment Checklist

### 1. Performance Optimization
- [ ] Bundle size under 50kB per route
- [ ] Images optimized (WebP format, responsive sizes)
- [ ] Lazy loading implemented for heavy components
- [ ] Service Worker configured for offline support

### 2. Security
- [ ] Environment variables properly configured
- [ ] API keys never exposed to client
- [ ] Firebase security rules reviewed and tested
- [ ] CORS properly configured
- [ ] CSP headers configured

### 3. Testing
- [ ] All tests passing (`pnpm test`)
- [ ] E2E tests passing (`pnpm run test:e2e`)
- [ ] Manual testing on iOS Safari
- [ ] PWA installation tested
- [ ] Offline functionality verified

## Vercel Deployment

### 1. Initial Setup

#### Install Vercel CLI
```bash
npm install -g vercel
```

#### Login to Vercel
```bash
vercel login
```

### 2. Project Configuration

Create `vercel.json` in project root:
```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm run build",
  "installCommand": "pnpm install",
  "regions": ["iad1"],
  "functions": {
    "app/api/ai/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### 3. Environment Variables

Set production environment variables in Vercel:

```bash
# Using Vercel CLI
vercel env add OPENAI_API_KEY production
vercel env add GOOGLE_AI_API_KEY production
vercel env add FIREBASE_PROJECT_ID production
vercel env add FIREBASE_CLIENT_EMAIL production
vercel env add FIREBASE_PRIVATE_KEY production

# Or use Vercel Dashboard
# Project Settings > Environment Variables
```

Required Variables:
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_AI_API_KEY` - Google AI API key
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Service account email
- `FIREBASE_PRIVATE_KEY` - Service account private key
- `NEXT_PUBLIC_FIREBASE_*` - Public Firebase config

### 4. Deploy to Production

#### Option A: CLI Deployment
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### Option B: Git Integration
1. Connect GitHub repository to Vercel
2. Push to main branch for automatic deployment
3. Pull requests create preview deployments

### 5. Custom Domain Setup

1. Add domain in Vercel Dashboard
2. Configure DNS:
   ```
   Type  Name    Value
   A     @       76.76.21.21
   CNAME www     cname.vercel-dns.com
   ```
3. Enable HTTPS (automatic with Vercel)

## Firebase Production Setup

### 1. Security Rules

Update `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Additional rules as needed
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

### 2. Indexes

Deploy Firestore indexes:
```bash
firebase deploy --only firestore:indexes
```

### 3. Authentication Configuration

1. Add production domain to authorized domains
2. Configure OAuth redirect URIs
3. Enable required authentication providers

## Performance Monitoring

### 1. Vercel Analytics

Enable in Vercel Dashboard:
- Web Vitals monitoring
- Real User Metrics (RUM)
- Custom events tracking

### 2. Implementation
```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

### 3. Monitoring Metrics

Key metrics to track:
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3.8s

## Progressive Web App (PWA) Deployment

### 1. Service Worker Registration

Ensure Service Worker is registered in production:
```tsx
// app/layout.tsx
useEffect(() => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    navigator.serviceWorker.register('/sw.js')
  }
}, [])
```

### 2. Manifest Configuration

Verify `public/manifest.json`:
```json
{
  "name": "Brain Space",
  "short_name": "BrainSpace",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#7C3AED",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 3. iOS-Specific Meta Tags

Ensure iOS support in `app/layout.tsx`:
```tsx
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="/icon-192.png" />
```

## Cost Optimization

### 1. Vercel Optimization
- Use ISR for static content
- Implement proper caching headers
- Optimize image delivery with Next.js Image
- Monitor function execution time

### 2. Firebase Optimization
- Use Firebase Emulators for development
- Implement proper caching strategies
- Batch Firestore operations
- Use Firestore bundles for initial data

### 3. AI API Optimization
- Implement request caching
- Use appropriate models for tasks
- Add rate limiting
- Monitor token usage

## Rollback Strategy

### 1. Vercel Instant Rollback
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]

# Or use Vercel Dashboard
# Deployments > Select Previous > Promote to Production
```

### 2. Database Rollback
- Export Firestore data before major changes
- Use Firebase Backups for point-in-time recovery
- Test migrations in staging environment first

## Post-Deployment Verification

### 1. Functional Testing
- [ ] Authentication flow works
- [ ] Brain dump categorization functional
- [ ] Timebox drag-and-drop works
- [ ] PWA installs correctly
- [ ] Offline mode functions

### 2. Performance Testing
- [ ] Lighthouse score > 90
- [ ] Bundle size within limits
- [ ] Core Web Vitals passing
- [ ] Mobile performance acceptable

### 3. Monitoring Setup
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] User analytics tracking
- [ ] Custom alerts configured

## Troubleshooting

### Build Failures
```bash
# Clear cache and rebuild
vercel --force

# Check build logs
vercel logs [deployment-url]
```

### Environment Variable Issues
```bash
# List all env vars
vercel env ls

# Pull env vars locally
vercel env pull
```

### Performance Issues
1. Check Vercel Functions logs
2. Review bundle analyzer output
3. Monitor Core Web Vitals
4. Check Firebase quota usage

## Scaling Considerations

### When to Scale
- Function execution approaching limits
- Firebase quotas being hit
- Response times degrading
- User base growing rapidly

### Scaling Options
1. **Vercel Pro/Enterprise**: Higher limits, better performance
2. **Firebase Blaze Plan**: Pay-as-you-go for production
3. **CDN Integration**: CloudFlare for static assets
4. **Database Optimization**: Firestore sharding, caching layers

## Security Best Practices

1. **API Security**
   - Rate limiting on all endpoints
   - Input validation with Zod
   - CORS properly configured
   - API keys rotated regularly

2. **Firebase Security**
   - Security rules thoroughly tested
   - Admin SDK only on server
   - User data properly scoped
   - Regular security audits

3. **Monitoring**
   - Set up alerts for suspicious activity
   - Monitor API usage patterns
   - Track authentication failures
   - Regular dependency updates

---

*For local development setup, see [Setup Guide](./setup.md)*
*For testing strategies, see [Testing Guide](./testing.md)*