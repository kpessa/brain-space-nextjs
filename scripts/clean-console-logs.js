#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to recursively find all files
function findFiles(dir, pattern, ignore = []) {
  const results = [];
  
  function walk(currentPath) {
    // Check if should ignore
    for (const ignorePattern of ignore) {
      if (currentPath.includes(ignorePattern)) return;
    }
    
    try {
      const list = fs.readdirSync(currentPath);
      list.forEach(file => {
        const filePath = path.join(currentPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat && stat.isDirectory()) {
          walk(filePath);
        } else if (pattern.test(file)) {
          results.push(filePath);
        }
      });
    } catch (err) {
      // Skip directories we can't read
    }
  }
  
  walk(dir);
  return results;
}

// Patterns to match
const filePattern = /\.(ts|tsx|js|jsx)$/;
const ignorePatterns = ['node_modules', '.next', 'dist', 'build', '.git'];

// Regular expressions for console statements
const consolePatterns = [
  /^\s*console\.(log|info|debug|warn|error|trace)\([^)]*\);?\s*$/gm,
  /^\s*console\.(log|info|debug|warn|error|trace)\([^)]*\n([^;]|\n)*?\);?\s*$/gm
];

let totalFiles = 0;
let totalRemoved = 0;

const files = findFiles('.', filePattern, ignorePatterns);

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;
    let removedCount = 0;
    
    // Remove console statements
    consolePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        removedCount += matches.length;
        content = content.replace(pattern, '');
      }
    });
    
    // Clean up extra blank lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content);
      console.log(`✓ Cleaned ${file}: removed ${removedCount} console statement(s)`);
      totalFiles++;
      totalRemoved += removedCount;
    }
  } catch (err) {

  }
});
