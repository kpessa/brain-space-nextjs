// Enhanced utilities for deeply nested relationships

// Get the depth of a node in its family tree
export const getNodeDepth = (node: any, allNodes: any[]): number => {
  let depth = 0
  let currentNode = node
  
  while (currentNode?.parent) {
    depth++
    currentNode = allNodes.find(n => n.id === currentNode.parent)
    // Prevent infinite loops
    if (depth > 10) break
  }
  
  return depth
}

// Get the root ancestor of a node
export const getRootAncestor = (node: any, allNodes: any[]): any => {
  let currentNode = node
  let visited = new Set<string>()
  
  while (currentNode?.parent) {
    if (visited.has(currentNode.id)) break // Prevent infinite loops
    visited.add(currentNode.id)
    
    const parent = allNodes.find(n => n.id === currentNode.parent)
    if (!parent) break
    currentNode = parent
  }
  
  return currentNode
}

// Get all descendants of a node (children, grandchildren, etc.)
export const getAllDescendants = (nodeId: string, allNodes: any[]): any[] => {
  const descendants: any[] = []
  const visited = new Set<string>()
  
  const collectDescendants = (id: string) => {
    if (visited.has(id)) return
    visited.add(id)
    
    // Find direct children
    const children = allNodes.filter(n => n.parent === id)
    
    // Also check children array if it exists
    const node = allNodes.find(n => n.id === id)
    if (node?.children) {
      node.children.forEach((childId: string) => {
        const child = allNodes.find(n => n.id === childId)
        if (child && !children.some(c => c.id === child.id)) {
          children.push(child)
        }
      })
    }
    
    children.forEach(child => {
      descendants.push(child)
      collectDescendants(child.id) // Recursive call
    })
  }
  
  collectDescendants(nodeId)
  return descendants
}

// Build a complete family tree starting from root nodes
export const buildFamilyTree = (nodes: any[], allNodes: any[]): Map<string, any[]> => {
  const families = new Map<string, any[]>()
  const processed = new Set<string>()
  
  // First, find all root nodes (no parent)
  const rootNodes = nodes.filter(node => {
    // It's a root if it has no parent, or its parent isn't in the current nodes
    return !node.parent || !allNodes.find(n => n.id === node.parent)
  })
  
  rootNodes.forEach(root => {
    if (processed.has(root.id)) return
    
    // Get all descendants
    const descendants = getAllDescendants(root.id, nodes)
    
    if (descendants.length > 0) {
      // This is a family tree
      const family = [root, ...descendants]
      families.set(root.id, family)
      
      // Mark all as processed
      family.forEach(node => processed.add(node.id))
    }
  })
  
  // Add standalone nodes (not part of any family tree)
  nodes.forEach(node => {
    if (!processed.has(node.id)) {
      families.set(`standalone-${node.id}`, [node])
    }
  })
  
  return families
}

// Group nodes by complete family trees (supports deep nesting)
export const groupNodesByDeepFamily = (nodes: any[], allNodes: any[]): Map<string, any[]> => {
  console.group('🌳 Deep Family Grouping')
  
  const families = buildFamilyTree(nodes, allNodes)
  
  // Log family trees
  families.forEach((familyNodes, familyId) => {
    if (!familyId.startsWith('standalone-')) {
      const depths = familyNodes.map(n => ({
        title: n.title,
        depth: getNodeDepth(n, allNodes)
      }))
      console.log(`Family ${familyId}:`, depths)
    }
  })
  
  console.log(`Created ${families.size} family groups`)
  console.groupEnd()
  
  return families
}

// Sort family members by hierarchy (parent first, then children by depth)
export const sortFamilyByHierarchy = (family: any[], allNodes: any[]): any[] => {
  return family.sort((a, b) => {
    const depthA = getNodeDepth(a, allNodes)
    const depthB = getNodeDepth(b, allNodes)
    
    // Sort by depth (parents before children)
    if (depthA !== depthB) return depthA - depthB
    
    // Same depth, sort by title
    return (a.title || '').localeCompare(b.title || '')
  })
}

// Get the appropriate indentation level for a node
export const getIndentLevel = (node: any, rootId: string, allNodes: any[]): number => {
  if (node.id === rootId) return 0
  
  let level = 0
  let currentNode = node
  
  while (currentNode?.parent && currentNode.parent !== rootId) {
    level++
    currentNode = allNodes.find(n => n.id === currentNode.parent)
    if (level > 10) break // Prevent infinite loops
  }
  
  return currentNode?.parent === rootId ? level + 1 : level
}