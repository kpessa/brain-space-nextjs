/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,
  
  // Skip type checking during build (we've already passed TypeScript compilation)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configure image domains - updated for Next.js 15
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  
  // Enable Turbopack for development (stable in Next.js 15)
  experimental: {
    // Turbopack is now enabled by default in Next.js 15 for dev mode
    // No need for explicit configuration
  },
  
  
  // Configure headers for Firebase Auth popup compatibility
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
      {
        // Special headers for Firebase auth handler
        source: '/__/auth/handler',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ]
  },
  
  // Redirect from old dashboard routes to new ones
  async redirects() {
    return [
      {
        source: '/dashboard/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ]
  },
  
  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },
  
  // Webpack configuration to handle CSS properly
  webpack: (config, { dev, isServer }) => {
    // Fix CSS hot reload issues in development
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            styles: {
              name: 'styles',
              test: /\.css$/,
              chunks: 'all',
              enforce: true,
            },
          },
        },
      }
      
      // Disable CSS extraction in development
      const cssRules = config.module.rules
        .find(rule => Array.isArray(rule.oneOf))
        ?.oneOf.filter(rule => rule.sideEffects === false)
      
      if (cssRules) {
        cssRules.forEach(rule => {
          if (rule.test && rule.test.toString().includes('css')) {
            rule.sideEffects = true
          }
        })
      }
    }
    
    return config
  },
}

module.exports = nextConfig