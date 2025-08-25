// Quick script to test creating nodes with parent-child relationships
// Run this in browser console to create test data

function createTestNodesWithRelationships() {
  // This should be run in the browser console on the matrix page

  // Get the useNodesStore from window (if available)
  if (typeof window === 'undefined' || !window.__ZUSTAND_DEVTOOLS__) {

    return;
  }
  
  // Mock function - in reality, you'd use the actual store methods

}

// Export for browser use
if (typeof window !== 'undefined') {
  window.createTestNodesWithRelationships = createTestNodesWithRelationships;
}

module.exports = { createTestNodesWithRelationships };