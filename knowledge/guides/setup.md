# Brain Space Development Setup Guide

This guide will help you set up a development environment for Brain Space.

## Prerequisites

- **Node.js**: v18+ (check with `node --version`)
- **pnpm**: v8+ (install with `npm install -g pnpm`)
- **Git**: For version control
- **Firebase CLI**: For Firebase services (optional)
  ```bash
  npm install -g firebase-tools
  ```

## Initial Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/brain-space-nextjs.git
cd brain-space-nextjs
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# AI Provider Keys (optional - mock service available)
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_google_ai_key

# Firebase Configuration (required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin (for server-side operations)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key_with_newlines"

# Google Calendar (optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/auth
```

### 4. Firebase Setup

#### Option A: Use Firebase Emulators (Recommended for Development)
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Initialize Firebase
firebase init

# Start emulators
firebase emulators:start
```

#### Option B: Connect to Live Firebase Project
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Google and Email/Password providers)
3. Enable Firestore Database
4. Copy configuration to `.env.local`

### 5. Run Development Server
```bash
pnpm run dev
```

The application will be available at http://localhost:3000

## Development Commands

```bash
# Start development server with hot reload
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm run start

# Run linting
pnpm run lint

# Run tests
pnpm test

# Run E2E tests
pnpm run test:e2e

# Analyze bundle size
pnpm run analyze
```

## Project Structure

```
brain-space-nextjs/
├── app/                 # Next.js App Router pages
│   ├── (auth)/         # Authentication pages
│   ├── (dashboard)/    # Main application pages
│   └── api/            # API routes
├── components/          # React components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
├── services/           # Business logic
├── store/              # Zustand state stores
├── types/              # TypeScript type definitions
└── knowledge/          # Documentation and research
```

## Common Development Scenarios

### Working with AI Services

The app supports multiple AI providers. You can:
1. Use real API keys for OpenAI/Google AI
2. Use the mock service (default) for development without API keys
3. Switch providers in the UI using the provider selector

### Testing Optimistic Updates

The app uses optimistic updates for better UX:
1. Actions appear to complete immediately
2. Rollback occurs on server errors
3. Test by disconnecting network mid-operation

### Working with Firebase Emulators

Benefits of using emulators:
- No cloud costs during development
- Faster response times
- Isolated test data
- Easy reset between tests

Start emulators with data:
```bash
firebase emulators:start --import=./emulator-data
```

Export emulator data:
```bash
firebase emulators:export ./emulator-data
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
pnpm run dev -- -p 3001
```

### Firebase Authentication Issues
1. Check Firebase configuration in `.env.local`
2. Ensure authentication providers are enabled in Firebase Console
3. Check browser console for detailed error messages
4. Verify redirect URLs are configured correctly

### Bundle Size Issues
```bash
# Analyze bundle
pnpm run analyze

# Check for large dependencies
npx depcheck

# Find duplicate packages
npx yarn-deduplicate
```

### TypeScript Errors
```bash
# Type check without building
pnpm tsc --noEmit

# Clean TypeScript cache
rm -rf tsconfig.tsbuildinfo
```

## Performance Optimization Tips

1. **Use Dynamic Imports**: For heavy components
   ```tsx
   const HeavyComponent = dynamic(() => import('./HeavyComponent'))
   ```

2. **Optimize Images**: Use Next.js Image component
   ```tsx
   import Image from 'next/image'
   ```

3. **Monitor Bundle Size**: Keep routes under 50kB
   ```bash
   pnpm run build
   # Check "First Load JS" column
   ```

4. **Use React DevTools Profiler**: Identify render bottlenecks

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

## Getting Help

- Check `/knowledge` directory for architecture and patterns
- Review existing code for examples
- Check browser console for errors
- Use React DevTools for component debugging

---

*For production deployment, see [Deployment Guide](./deployment.md)*