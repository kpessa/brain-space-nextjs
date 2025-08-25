#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to match console.log statements
const consoleLogPatterns = [
  // Single line console.log
  /^\s*console\.log\([^)]*\);?\s*$/gm,
  // Multi-line console.log
  /^\s*console\.log\([^{]*{\s*\n(?:[^\}]*\n)*?\s*}\);?\s*$/gm,
  // Console.log with template literals
  /^\s*console\.log\(`[^`]*`(?:,\s*[^)]+)?\);?\s*$/gm,
];

// Files/directories to skip
const skipPatterns = [
  '**/node_modules/**',
  '**/.next/**',
  '**/scripts/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
];

function removeConsoleLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let count = 0;

  // Remove console.log statements
  consoleLogPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      count += matches.length;
      content = content.replace(pattern, '');
    }
  });

  // Clean up extra blank lines (more than 2 consecutive)
  content = content.replace(/\n{3,}/g, '\n\n');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');

    return count;
  }
  
  return 0;
}

// Find all TypeScript and JavaScript files
const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
  ignore: skipPatterns,
  nodir: true
});

let totalRemoved = 0;
let filesModified = 0;

files.forEach(file => {
  const removed = removeConsoleLogs(file);
  if (removed > 0) {
    totalRemoved += removed;
    filesModified++;
  }
});
