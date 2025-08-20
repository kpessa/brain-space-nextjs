// Quick script to test creating nodes with parent-child relationships
// Run this in browser console to create test data

function createTestNodesWithRelationships() {
  // This should be run in the browser console on the matrix page
  console.log('Creating test nodes with parent-child relationships...');
  
  // Get the useNodesStore from window (if available)
  if (typeof window === 'undefined' || !window.__ZUSTAND_DEVTOOLS__) {
    console.error('This script should be run in the browser console');
    return;
  }
  
  // Mock function - in reality, you'd use the actual store methods
  console.log('To create test data:');
  console.log('1. Go to the matrix page');
  console.log('2. Add a task called "Plan vacation"');
  console.log('3. Add a task called "Book flights" and set it as a child of "Plan vacation"');
  console.log('4. Add a task called "Book hotel" and set it as a child of "Plan vacation"');
  console.log('5. Check if relationships show in matrix view');
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.createTestNodesWithRelationships = createTestNodesWithRelationships;
}

module.exports = { createTestNodesWithRelationships };