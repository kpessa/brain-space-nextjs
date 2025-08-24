const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Optimize bundle splitting
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split heavy dependencies into separate chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // React Flow - Heavy dependency (~400KB)
          reactflow: {
            test: /[\\/]node_modules[\\/]@xyflow[\\/]/,
            name: 'reactflow',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Drag and Drop - Heavy dependency (~200KB)
          dnd: {
            test: /[\\/]node_modules[\\/]@hello-pangea[\\/]/,
            name: 'dnd',
            priority: 25,
            reuseExistingChunk: true,
          },
          // Firebase - Large SDK
          firebase: {
            test: /[\\/]node_modules[\\/](@firebase|firebase)[\\/]/,
            name: 'firebase',
            priority: 20,
            reuseExistingChunk: true,
          },
          // AI SDKs - OpenAI and Google
          ai: {
            test: /[\\/]node_modules[\\/](openai|@google\/generative-ai)[\\/]/,
            name: 'ai-sdks',
            priority: 15,
            reuseExistingChunk: true,
          },
          // UI Icons
          icons: {
            test: /[\\/]node_modules[\\/](lucide-react|react-icons)[\\/]/,
            name: 'icons',
            priority: 10,
            reuseExistingChunk: true,
          },
          // Common vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Get the package name
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )?.[1]
              
              // Group small packages together
              if (packageName) {
                // Group React-related packages
                if (packageName.startsWith('react') || 
                    packageName.includes('react')) {
                  return 'react-vendor'
                }
                // Group utility libraries
                if (['clsx', 'dayjs', 'zod', 'jwt-decode'].includes(packageName)) {
                  return 'utils'
                }
              }
              
              return 'vendor'
            },
            priority: 5,
            reuseExistingChunk: true,
          },
          // Common modules shared between pages
          common: {
            minChunks: 2,
            priority: 0,
            reuseExistingChunk: true,
          },
        },
        // Maximum parallel requests
        maxAsyncRequests: 30,
        maxInitialRequests: 25,
        // Minimum chunk size
        minSize: 20000,
        // Maximum chunk size before splitting
        maxSize: 244000,
      }
    }
    
    return config
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      'firebase',
      '@tanstack/react-query',
      'dayjs',
      'zustand'
    ],
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Enable SWC minification
  swcMinify: true,

  // Compression
  compress: true,

  // Module ID strategy for long-term caching
  webpack(config) {
    config.optimization.moduleIds = 'deterministic'
    return config
  }
}

module.exports = withBundleAnalyzer(nextConfig)