// Helper function to calculate priority score
export const calculatePriority = (urgency?: number, importance?: number): number => {
  return (urgency || 5) + (importance || 5)
}

// Helper function to get priority level and color
export const getPriorityLevel = (score: number): { level: string; colorClass: string; bgClass: string } => {
  if (score >= 14) {
    return { level: 'High', colorClass: 'text-red-600', bgClass: 'bg-red-100' }
  } else if (score >= 10) {
    return { level: 'Medium', colorClass: 'text-yellow-600', bgClass: 'bg-yellow-100' }
  } else {
    return { level: 'Low', colorClass: 'text-gray-600', bgClass: 'bg-gray-100' }
  }
}

// Group nodes in Do First quadrant by priority levels
export const groupDoFirstNodes = (nodes: any[]) => {
  const groups = {
    critical: [] as any[],
    today: [] as any[],
    thisWeek: [] as any[]
  }
  
  nodes.forEach(node => {
    const urgency = node.urgency || 5
    const importance = node.importance || 5
    
    if (urgency >= 9 && importance >= 9) {
      groups.critical.push(node)
    } else if (urgency >= 8 && importance >= 8) {
      groups.today.push(node)
    } else {
      groups.thisWeek.push(node)
    }
  })
  
  return groups
}

export const INITIAL_ITEMS_PER_QUADRANT = 5
export const LOAD_MORE_INCREMENT = 5

// Family color palette for parent-child groups
const FAMILY_COLORS = [
  { accent: '#3B82F6', bg: 'rgba(59, 130, 246, 0.05)', border: 'border-blue-500' }, // Blue
  { accent: '#10B981', bg: 'rgba(16, 185, 129, 0.05)', border: 'border-emerald-500' }, // Green
  { accent: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.05)', border: 'border-violet-500' }, // Purple
  { accent: '#F59E0B', bg: 'rgba(245, 158, 11, 0.05)', border: 'border-amber-500' }, // Amber
  { accent: '#EF4444', bg: 'rgba(239, 68, 68, 0.05)', border: 'border-red-500' }, // Red
  { accent: '#EC4899', bg: 'rgba(236, 72, 153, 0.05)', border: 'border-pink-500' }, // Pink
  { accent: '#06B6D4', bg: 'rgba(6, 182, 212, 0.05)', border: 'border-cyan-500' }, // Cyan
  { accent: '#84CC16', bg: 'rgba(132, 204, 22, 0.05)', border: 'border-lime-500' }, // Lime
]

// Get consistent family color for a parent node
export const getFamilyColor = (parentId: string): typeof FAMILY_COLORS[0] => {
  // Use parent ID to generate consistent color index
  const hash = parentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return FAMILY_COLORS[hash % FAMILY_COLORS.length]
}

// Check if a node has children in the provided nodes array
export const hasChildren = (nodeId: string, allNodes: any[]): boolean => {
  // Check both: nodes that reference this as parent, OR this node has a children array
  const node = allNodes.find(n => n.id === nodeId)
  const hasChildrenArray = node && node.children && node.children.length > 0
  const hasChildNodes = allNodes.some(n => n.parent === nodeId)
  return hasChildrenArray || hasChildNodes
}

// Get all children of a node
export const getNodeChildren = (nodeId: string, allNodes: any[]): any[] => {
  const node = allNodes.find(n => n.id === nodeId)
  const childrenFromArray = node?.children || []
  const childrenFromParentRef = allNodes.filter(n => n.parent === nodeId)
  
  // Combine both methods and deduplicate
  const allChildIds = new Set([
    ...childrenFromArray,
    ...childrenFromParentRef.map(n => n.id)
  ])
  
  return Array.from(allChildIds)
    .map(childId => allNodes.find(n => n.id === childId))
    .filter(child => child !== undefined)
}

// Get the parent node
export const getParentNode = (node: any, allNodes: any[]): any | null => {
  if (!node.parent) return null
  return allNodes.find(n => n.id === node.parent) || null
}

// Get all siblings (including self)
export const getNodeSiblings = (node: any, allNodes: any[]): any[] => {
  if (!node.parent) return [node]
  return allNodes.filter(n => n.parent === node.parent)
}

// Get the depth of a node in its family tree
export const getNodeDepth = (node: any, allNodes: any[]): number => {
  let depth = 0
  let currentNode = node
  const visited = new Set<string>()
  
  while (currentNode?.parent) {
    if (visited.has(currentNode.id)) break // Prevent infinite loops
    visited.add(currentNode.id)
    
    depth++
    currentNode = allNodes.find(n => n.id === currentNode.parent)
    if (depth > 10) break // Max depth safety
  }
  
  return depth
}

// Get all descendants of a node (children, grandchildren, etc.)
export const getAllDescendants = (nodeId: string, allNodes: any[], maxDepth: number = 10): any[] => {
  const descendants: any[] = []
  const visited = new Set<string>()
  
  const collectDescendants = (id: string, currentDepth: number = 0) => {
    if (visited.has(id) || currentDepth > maxDepth) return
    visited.add(id)
    
    // Find direct children via parent reference
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
      collectDescendants(child.id, currentDepth + 1) // Recursive call
    })
  }
  
  collectDescendants(nodeId)
  return descendants
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

// Group nodes by their parent relationships for a quadrant
export const groupNodesByFamily = (nodes: any[], allNodes: any[]): Map<string, any[]> => {
  console.group('👪 Family Grouping')
  
  // Check nodes in THIS quadrant only
  const nodesInQuadrant = nodes.filter(n => n.parent || (n.children && n.children.length > 0))
  
  if (nodesInQuadrant.length > 0) {
    console.log(`🔗 ${nodesInQuadrant.length} nodes with relationships in this quadrant`)
    
    // Debug: Check if parent IDs actually exist
    const nodesWithParents = nodes.filter(n => n.parent)
    if (nodesWithParents.length > 0) {
      console.log(`📍 ${nodesWithParents.length} nodes have parent field:`)
      nodesWithParents.forEach(n => {
        const parentExists = allNodes.find(p => p.id === n.parent)
        const parentInQuadrant = nodes.find(p => p.id === n.parent)
        console.log(`  "${n.title}" -> parent: ${n.parent}`)
        console.log(`    Parent exists in all nodes: ${parentExists ? '✅' : '❌'}`)
        console.log(`    Parent in same quadrant: ${parentInQuadrant ? '✅' : '❌'}`)
      })
    }
    
    // Debug: Check if children IDs actually exist
    const nodesWithChildren = nodes.filter(n => n.children && n.children.length > 0)
    if (nodesWithChildren.length > 0) {
      console.log(`📍 ${nodesWithChildren.length} nodes have children array:`)
      nodesWithChildren.forEach(n => {
        const childrenInAllNodes = n.children.filter((childId: string) => 
          allNodes.find(c => c.id === childId)
        )
        const childrenInQuadrant = n.children.filter((childId: string) => 
          nodes.find(c => c.id === childId)
        )
        console.log(`  "${n.title}" -> ${n.children.length} children`)
        console.log(`    Children exist in all nodes: ${childrenInAllNodes.length}/${n.children.length}`)
        console.log(`    Children in same quadrant: ${childrenInQuadrant.length}/${n.children.length}`)
        if (childrenInQuadrant.length > 0) {
          const childNames = childrenInQuadrant.map((id: string) => 
            nodes.find(c => c.id === id)?.title || id
          )
          console.log(`    Children in quadrant: ${childNames.join(', ')}`)
        }
      })
    }
  } else {
    console.log('❌ No relationships in this quadrant')
  }
  
  const families = new Map<string, any[]>()
  const processed = new Set<string>()
  
  // Find all root nodes in this quadrant (nodes with no parent or parent not in quadrant)
  const rootNodes = nodes.filter(node => {
    if (processed.has(node.id)) return false
    
    // Check if this node has no parent or parent isn't in the quadrant
    const hasNoParent = !node.parent
    const parentNotInQuadrant = node.parent && !nodes.find(n => n.id === node.parent)
    
    // Also check if this is the highest ancestor in the quadrant
    let isHighestInQuadrant = false
    if (node.parent) {
      // Traverse up to find if any ancestors are in the quadrant
      let currentNode = node
      let foundHigherAncestor = false
      const visited = new Set<string>()
      
      while (currentNode.parent && !visited.has(currentNode.id)) {
        visited.add(currentNode.id)
        const parent = nodes.find(n => n.id === currentNode.parent)
        if (parent) {
          foundHigherAncestor = true
          break
        }
        currentNode = allNodes.find(n => n.id === currentNode.parent) || currentNode
      }
      
      isHighestInQuadrant = !foundHigherAncestor
    }
    
    return hasNoParent || (parentNotInQuadrant && isHighestInQuadrant)
  })
  
  console.log(`🌳 Found ${rootNodes.length} root nodes in quadrant`)
  
  // For each root, collect all its descendants that are in the quadrant
  rootNodes.forEach(root => {
    if (processed.has(root.id)) return
    
    const familyMembers = [root]
    processed.add(root.id)
    
    // Get ALL descendants (not just direct children)
    const allDescendants = getAllDescendants(root.id, nodes)
    
    // Add descendants to family
    allDescendants.forEach(descendant => {
      if (!processed.has(descendant.id)) {
        familyMembers.push(descendant)
        processed.add(descendant.id)
      }
    })
    
    // Sort family by hierarchy
    const sortedFamily = sortFamilyByHierarchy(familyMembers, allNodes)
    
    if (sortedFamily.length > 1) {
      console.log(`  🏠 Family ${root.title}: ${sortedFamily.length} members (max depth: ${Math.max(...sortedFamily.map(n => getNodeDepth(n, allNodes)))})`)
      families.set(root.id, sortedFamily)
    } else if (hasChildren(root.id, allNodes)) {
      // Single parent whose children are in other quadrants
      console.log(`  👤 Parent ${root.title} (children in other quadrants)`)
      families.set(root.id, [root])
    } else {
      // Standalone node
      families.set(`standalone-${root.id}`, [root])
    }
  })
  
  // Add any nodes that weren't processed (shouldn't happen but just in case)
  const unprocessedNodes = nodes.filter(node => !processed.has(node.id))
  
  if (unprocessedNodes.length > 0) {
    console.log(`⚠️ ${unprocessedNodes.length} unprocessed nodes:`, unprocessedNodes.map(n => n.title))
    unprocessedNodes.forEach(node => {
      families.set(`unprocessed-${node.id}`, [node])
    })
  }
  
  const standaloneCount = Array.from(families.keys()).filter(key => key.startsWith('standalone-')).length
  if (standaloneCount > 0) {
    console.log(`🔲 ${standaloneCount} standalone nodes`)
  }
  
  if (families.size > 0) {
    console.log(`✅ Created ${families.size} family groups`)
    families.forEach((familyNodes, familyId) => {
      if (!familyId.startsWith('standalone-') && !familyId.startsWith('unprocessed-')) {
        const depths = familyNodes.map(n => `${n.title}(L${getNodeDepth(n, allNodes)})`)
        console.log(`  Family: ${depths.join(' → ')}`)
      }
    })
  }
  console.groupEnd()
  
  return families
}