#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files/directories to exclude from console.log removal
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/jest.setup.js',
  '**/jest.config.js',
  '**/scripts/**',
  '**/lib/performance.ts', // Performance monitoring needs console
  '**/lib/errorTracking.ts', // Error tracking needs console.error
  '**/lib/firebase-admin.ts', // Firebase admin logging
];

// Patterns that should keep console.error
const KEEP_ERROR_PATTERNS = [
  'ErrorBoundary',
  'error handler',
  'catch',
];

function shouldProcessFile(filePath) {
  for (const pattern of EXCLUDE_PATTERNS) {
    if (filePath.includes(pattern.replace(/\*/g, ''))) {
      return false;
    }
  }
  return true;
}

function cleanConsoleLogs(filePath) {
  if (!shouldProcessFile(filePath)) {
    return { removed: 0, kept: 0 };
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let removedCount = 0;
  let keptCount = 0;

  // Remove console.log statements
  content = content.replace(/^\s*console\.log\([^)]*\);?\s*$/gm, (match) => {
    removedCount++;
    return '';
  });

  // Remove console.debug statements
  content = content.replace(/^\s*console\.debug\([^)]*\);?\s*$/gm, (match) => {
    removedCount++;
    return '';
  });

  // Remove console.warn statements (keep in error handlers)
  content = content.replace(/^\s*console\.warn\([^)]*\);?\s*$/gm, (match, offset) => {
    // Check if this is in an error handler
    const precedingCode = content.substring(Math.max(0, offset - 200), offset);
    if (precedingCode.includes('catch') || precedingCode.includes('error')) {
      keptCount++;
      return match;
    }
    removedCount++;
    return '';
  });

  // Conditionally remove console.error
  content = content.replace(/^\s*console\.error\([^)]*\);?\s*$/gm, (match, offset) => {
    // Check if this is in a legitimate error handler
    const precedingCode = content.substring(Math.max(0, offset - 200), offset);
    const fileName = path.basename(filePath);
    
    // Keep console.error in error handling contexts
    if (
      KEEP_ERROR_PATTERNS.some(pattern => fileName.toLowerCase().includes(pattern.toLowerCase())) ||
      precedingCode.includes('catch') ||
      precedingCode.includes('error') ||
      precedingCode.includes('reject')
    ) {
      keptCount++;
      return match;
    }
    
    removedCount++;
    return '';
  });

  // Clean up multiple empty lines
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return { removed: removedCount, kept: keptCount, modified: true };
  }

  return { removed: 0, kept: keptCount, modified: false };
}

function processFiles() {
  const patterns = [
    'app/**/*.{ts,tsx,js,jsx}',
    'components/**/*.{ts,tsx,js,jsx}',
    'lib/**/*.{ts,tsx,js,jsx}',
    'store/**/*.{ts,tsx,js,jsx}',
    'hooks/**/*.{ts,tsx,js,jsx}',
    'services/**/*.{ts,tsx,js,jsx}',
    'contexts/**/*.{ts,tsx,js,jsx}',
  ];

  let totalRemoved = 0;
  let totalKept = 0;
  let filesModified = 0;

  patterns.forEach(pattern => {
    const files = glob.sync(pattern, { 
      cwd: path.join(__dirname, '..'),
      absolute: true 
    });

    files.forEach(file => {
      const result = cleanConsoleLogs(file);
      if (result.modified) {
        filesModified++;
        console.log(`✓ Cleaned ${file} (removed: ${result.removed}, kept: ${result.kept})`);
      }
      totalRemoved += result.removed;
      totalKept += result.kept;
    });
  });

  console.log('\n📊 Summary:');
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Console statements removed: ${totalRemoved}`);
  console.log(`   Console statements kept (in error handlers): ${totalKept}`);
}

// Run the script
console.log('🧹 Cleaning console.log statements from production code...\n');
processFiles();
console.log('\n✅ Done!');