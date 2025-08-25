#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to match commented out code
const commentPatterns = [
  // Single line commented code (// followed by what looks like code)
  /^\s*\/\/\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[:=\(\{]/gm,
  // Multi-line comment blocks with code
  /\/\*[\s\S]*?\*\//gm,
  // Consecutive single-line comments that look like code
  /(?:^\s*\/\/.*\n){3,}/gm,
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
  '**/CLAUDE.md',
  '**/*.json',
];

function cleanCommentedCode(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let count = 0;

  // Skip files with specific markers
  if (content.includes('@preserve-comments') || content.includes('eslint-')) {
    return 0;
  }

  // Remove obvious commented out code
  // But preserve legitimate comments (those starting with explanation text)
  const lines = content.split('\n');
  const newLines = [];
  let inCommentBlock = false;
  let commentBlockLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this is a legitimate comment (explanatory text)
    const isLegitComment = trimmed.match(/^\/\/\s*[A-Z]/) || // Starts with capital letter
                          trimmed.match(/^\/\/\s*(TODO|FIXME|NOTE|HACK|XXX|IMPORTANT):/) || // Has comment tag
                          trimmed.match(/^\/\/\s*@/) || // Has annotation
                          trimmed.match(/^\/\*\*/) || // JSDoc comment
                          trimmed.match(/^\/\/\s*eslint/) || // ESLint directive
                          trimmed === '//' || // Empty comment line
                          trimmed.match(/^\/\/\s*[-=]+$/); // Separator line

    // Check if this looks like commented out code
    const isCommentedCode = trimmed.match(/^\/\/\s*[a-z_$][a-zA-Z0-9_$]*\s*[:=\(\{]/) ||
                           trimmed.match(/^\/\/\s*(import|export|const|let|var|function|class|if|for|while|return)\s/);

    if (isCommentedCode && !isLegitComment) {
      count++;
      // Skip this line (remove commented code)
    } else {
      newLines.push(line);
    }
  }

  content = newLines.join('\n');

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
  const removed = cleanCommentedCode(file);
  if (removed > 0) {
    totalRemoved += removed;
    filesModified++;
  }
});
