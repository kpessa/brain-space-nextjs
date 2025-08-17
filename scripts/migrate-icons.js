#!/usr/bin/env node

/**
 * Script to migrate lucide-react imports to centralized icons
 * Usage: node scripts/migrate-icons.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Get all TypeScript/React files
const files = glob.sync('**/*.{ts,tsx}', {
  ignore: [
    'node_modules/**',
    '.next/**',
    'lib/icons.ts',
    'scripts/**'
  ]
});

console.log(`Found ${files.length} files to check...`);

let filesModified = 0;
let totalIconsReplaced = 0;

files.forEach(file => {
  const filePath = path.resolve(file);
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Match lucide-react imports
  const lucideImportRegex = /import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/g;
  const matches = content.match(lucideImportRegex);
  
  if (matches) {
    matches.forEach(match => {
      // Extract icon names
      const iconMatch = match.match(/import\s+{([^}]+)}/);
      if (iconMatch) {
        const icons = iconMatch[1]
          .split(',')
          .map(icon => icon.trim())
          .filter(Boolean);
        
        // Check if all icons are available in our centralized file
        const availableIcons = [
          'Menu', 'X', 'ChevronLeft', 'ChevronRight', 'ChevronDown', 'ChevronUp',
          'MoreHorizontal', 'MoreVertical', 'Settings', 'Home', 'Plus', 'Minus',
          'Edit', 'Edit2', 'Edit3', 'Trash', 'Trash2', 'Save', 'Download', 'Upload',
          'Copy', 'Share', 'Share2', 'Send', 'Check', 'CheckCircle', 'CheckSquare',
          'Circle', 'Square', 'AlertCircle', 'Info', 'AlertTriangle', 'Search',
          'Filter', 'Calendar', 'CalendarPlus', 'CalendarDays', 'Clock', 'Timer',
          'Target', 'Zap', 'Sparkles', 'Brain', 'FileText', 'MessageSquare',
          'MessageCircle', 'Mic', 'Image', 'Paperclip', 'Tag', 'Tags', 'Folder',
          'FolderOpen', 'Archive', 'Inbox', 'Grid3x3', 'LayoutGrid', 'List',
          'Link', 'LinkIcon', 'Unlink', 'GitBranch', 'GitMerge', 'Network',
          'TreePine', 'User', 'Users', 'LogIn', 'LogOut', 'UserPlus', 'Pin',
          'Repeat', 'RefreshCw', 'Shuffle', 'TrendingUp', 'Trophy', 'Star',
          'Heart', 'Flag', 'Bookmark', 'Maximize', 'Minimize', 'Expand', 'Shrink',
          'Move', 'Play', 'Pause', 'SkipForward', 'SkipBack', 'Sun', 'Moon',
          'Cloud', 'CloudRain', 'Coffee', 'Briefcase', 'DollarSign', 'Eye',
          'EyeOff', 'HelpCircle', 'Activity', 'BarChart', 'TrendingDown', 'Loader',
          'Loader2', 'LucideIcon', 'Stethoscope', 'Car', 'MapPin', 'Settings2',
          'CalendarSync', 'Lightbulb', 'BookOpen', 'Code', 'Database', 'Globe',
          'Layers', 'Package', 'Palette', 'Shield', 'Terminal', 'Cpu', 'Rocket',
          'FlaskConical', 'GraduationCap', 'Wrench'
        ];
        
        const allAvailable = icons.every(icon => 
          availableIcons.includes(icon) || icon === 'type' || icon.startsWith('Lucide')
        );
        
        if (allAvailable) {
          // Replace with centralized import
          const newImport = `import { ${icons.join(', ')} } from '@/lib/icons'`;
          content = content.replace(match, newImport);
          totalIconsReplaced += icons.length;
          console.log(`  ✓ ${file}: Replaced ${icons.length} icons`);
        } else {
          // Find which icons are not available
          const unavailable = icons.filter(icon => 
            !availableIcons.includes(icon) && icon !== 'type' && !icon.startsWith('Lucide')
          );
          if (unavailable.length > 0) {
            console.log(`  ⚠ ${file}: Missing icons in centralized file: ${unavailable.join(', ')}`);
          }
        }
      }
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesModified++;
    }
  }
});

console.log(`\n✅ Migration complete!`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Icons replaced: ${totalIconsReplaced}`);

// List remaining lucide-react imports
console.log('\n📋 Files still using lucide-react directly:');
const remaining = files.filter(file => {
  const content = fs.readFileSync(path.resolve(file), 'utf8');
  return content.includes("from 'lucide-react'");
});

if (remaining.length > 0) {
  remaining.forEach(file => console.log(`   - ${file}`));
  console.log(`\n   Total: ${remaining.length} files`);
} else {
  console.log('   None! All imports have been migrated. 🎉');
}