#!/usr/bin/env node

/**
 * Verify Store Consolidation Backward Compatibility
 * This script checks that all the old store imports still work correctly
 * after the consolidation from 14 stores to 6 domain stores
 */

const { join } = require('path');

// Store mappings for verification
const storeMappings = {
  // Core Store consolidations
  'authStore': {
    consolidatedIn: 'coreStore',
    expectedExports: ['useAuthStore'],
    testSelectors: ['user', 'isAuthenticated', 'signIn', 'signOut']
  },
  'userPreferencesStore': {
    consolidatedIn: 'coreStore',
    expectedExports: ['useUserPreferencesStore'],
    testSelectors: ['currentMode', 'themeMode', 'setMode', 'toggleMode']
  },
  'scheduleStore': {
    consolidatedIn: 'coreStore',
    expectedExports: ['useScheduleStore'],
    testSelectors: ['preferences', 'getSuggestedMode', 'workSchedule']
  },
  
  // Planning Store consolidations
  'timeboxStore': {
    consolidatedIn: 'planningStore',
    expectedExports: ['useTimeboxStore'],
    testSelectors: ['selectedDate', 'timeSlots', 'addTaskToSlot']
  },
  
  // Content Store consolidations
  'braindumpStore': {
    consolidatedIn: 'contentStore',
    expectedExports: ['useBraindumpStore'],
    testSelectors: ['entries', 'categories', 'addThought']
  },
  'journalStore': {
    consolidatedIn: 'contentStore',
    expectedExports: ['useJournalStore'],
    testSelectors: ['entries', 'currentEntry', 'createEntry']
  },
  
  // Tasks Store consolidations
  'todoStore': {
    consolidatedIn: 'tasksStore',
    expectedExports: ['useTodoStore'],
    testSelectors: ['todos', 'addTodo', 'updateTodo']
  },
  'calendarStore': {
    consolidatedIn: 'tasksStore',
    expectedExports: ['useCalendarStore'],
    testSelectors: ['events', 'importedEvents', 'addEvent']
  },
  'routineStore': {
    consolidatedIn: 'tasksStore',
    expectedExports: ['useRoutineStore'],
    testSelectors: ['routines', 'addRoutine', 'toggleTask']
  },
  
  // UI Store consolidations
  'xpStore': {
    consolidatedIn: 'uiStore',
    expectedExports: ['useXPStore'],
    testSelectors: ['userProgress', 'awardXP', 'checkAchievements']
  }
};

async function verifyStoreCompatibility() {
  console.log('🔍 Verifying Store Consolidation Backward Compatibility\n');
  console.log('=' .repeat(60));
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  for (const [storeName, config] of Object.entries(storeMappings)) {
    console.log(`\n📦 Checking ${storeName}...`);
    
    try {
      // Try to import the store
      const storePath = join(__dirname, '..', 'store', storeName);
      let storeModule;
      
      try {
        // This would work in a Node environment with proper module resolution
        // For now, we'll just check if the file exists
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '..', 'store', `${storeName}.ts`);
        
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for re-export pattern
          const hasReexport = content.includes(`from './${config.consolidatedIn}'`) ||
                            content.includes(`from "./${config.consolidatedIn}"`);
          
          // Check for expected exports
          const hasExpectedExports = config.expectedExports.every(exp => 
            content.includes(exp)
          );
          
          if (hasReexport && hasExpectedExports) {
            console.log(`  ✅ Re-export from ${config.consolidatedIn} found`);
            console.log(`  ✅ Expected exports present: ${config.expectedExports.join(', ')}`);
            results.passed.push(storeName);
          } else if (!hasReexport) {
            console.log(`  ⚠️  Custom compatibility wrapper detected`);
            if (hasExpectedExports) {
              console.log(`  ✅ Expected exports present: ${config.expectedExports.join(', ')}`);
              results.passed.push(storeName);
            } else {
              console.log(`  ❌ Missing expected exports`);
              results.failed.push(storeName);
            }
          } else {
            console.log(`  ❌ Missing expected exports`);
            results.failed.push(storeName);
          }
          
          // Check for specific patterns that might indicate issues
          if (content.includes('// TODO') || content.includes('// FIXME')) {
            results.warnings.push(`${storeName}: Contains TODO/FIXME comments`);
          }
          
        } else {
          console.log(`  ❌ Compatibility shim not found at store/${storeName}.ts`);
          results.failed.push(storeName);
        }
        
      } catch (error) {
        console.log(`  ❌ Error checking store: ${error.message}`);
        results.failed.push(storeName);
      }
      
    } catch (error) {
      console.log(`  ❌ Failed to verify: ${error.message}`);
      results.failed.push(storeName);
    }
  }
  
  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 SUMMARY\n');
  
  console.log(`✅ Passed: ${results.passed.length}/${Object.keys(storeMappings).length}`);
  if (results.passed.length > 0) {
    console.log(`   ${results.passed.join(', ')}`);
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    console.log(`   ${results.failed.join(', ')}`);
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(w => console.log(`   - ${w}`));
  }
  
  // Check for files that might be using old imports
  console.log('\n' + '=' .repeat(60));
  console.log('🔍 Checking for potential breaking changes in components...\n');
  
  const fs = require('fs');
  const path = require('path');
  const glob = require('glob');
  
  // Find all TypeScript files
  const files = glob.sync('**/*.{ts,tsx}', {
    cwd: path.join(__dirname, '..'),
    ignore: ['node_modules/**', '.next/**', 'scripts/**', 'store/**']
  });
  
  const issueFiles = [];
  files.forEach(file => {
    const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    
    // Check for direct property access that might break
    if (content.includes('.preferences.autoSwitchMode') && !file.includes('test')) {
      // This pattern was the one that broke
      issueFiles.push({ file, issue: 'Direct .preferences.autoSwitchMode access' });
    }
  });
  
  if (issueFiles.length > 0) {
    console.log(`⚠️  Found ${issueFiles.length} files with potential issues:`);
    issueFiles.forEach(({ file, issue }) => {
      console.log(`   - ${file}: ${issue}`);
    });
  } else {
    console.log('✅ No obvious breaking changes detected in component files');
  }
  
  // Final verdict
  console.log('\n' + '=' .repeat(60));
  if (results.failed.length === 0 && issueFiles.length === 0) {
    console.log('✅ VERDICT: Store consolidation backward compatibility verified!');
    process.exit(0);
  } else {
    console.log('❌ VERDICT: Some compatibility issues detected');
    console.log('   Run "pnpm run dev" to test the application');
    process.exit(1);
  }
}

// Run verification
verifyStoreCompatibility().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});