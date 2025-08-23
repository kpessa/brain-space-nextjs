import React from 'react'
import { AccordionGroup } from './AccordionGroup'
import { MatrixNodeCard } from './MatrixNodeCard'
import {
  groupDoFirstNodes,
  groupNodesByFamily,
  hasChildren,
  getNodeChildren,
  getParentNode,
  getFamilyColor,
  getNodeDepth,
} from './utils'

interface MatrixQuadrantRendererProps {
  quadrantId: string
  allNodes: any[]
  visibleNodes: any[]
  nodes: any[]  // All nodes in the app
  isDoFirst: boolean
  isCollapsedView: boolean
  expandedGroups: Set<string>
  expandedFamilies: Set<string>
  expandedNodes: Set<string>
  contextMenuNodeId?: string
  onToggleGroup: (groupId: string) => void
  onToggleFamily: (familyId: string) => void
  onToggleNode: (nodeId: string) => void
  onNodeContextMenu: (e: React.MouseEvent, node: any) => void
  onNodeDoubleClick?: (node: any) => void
}

export function MatrixQuadrantRenderer({
  quadrantId,
  allNodes,
  visibleNodes,
  nodes,
  isDoFirst,
  isCollapsedView,
  expandedGroups,
  expandedFamilies,
  expandedNodes,
  contextMenuNodeId,
  onToggleGroup,
  onToggleFamily,
  onToggleNode,
  onNodeContextMenu,
  onNodeDoubleClick,
}: MatrixQuadrantRendererProps) {
  
  // Temporarily disabled accordion view for Do First quadrant to show relationships
  if (false && isDoFirst && allNodes.length > 0) {
    // Render accordion groups for Do First quadrant
    const groups = groupDoFirstNodes(visibleNodes)
    const groupConfigs = [
      { id: 'critical', label: 'Critical', nodes: groups.critical, color: 'text-red-700 bg-red-50' },
      { id: 'today', label: 'Today', nodes: groups.today, color: 'text-orange-700 bg-orange-50' },
      { id: 'thisWeek', label: 'This Week', nodes: groups.thisWeek, color: 'text-yellow-700 bg-yellow-50' }
    ]
    
    let currentIndex = 0
    return (
      <div className="space-y-3">
        {groupConfigs.map(group => {
          const groupElement = (
            <AccordionGroup
              key={group.id}
              label={group.label}
              nodes={group.nodes}
              color={group.color}
              isExpanded={expandedGroups.has(group.id)}
              isCollapsedView={isCollapsedView}
              onToggle={() => onToggleGroup(group.id)}
              onNodeContextMenu={onNodeContextMenu}
              contextMenuNodeId={contextMenuNodeId}
              baseIndex={currentIndex}
            />
          )
          if (expandedGroups.has(group.id)) {
            currentIndex += group.nodes.length
          }
          return groupElement
        })}
      </div>
    )
  }
  
  // Regular rendering with family grouping
  
  // Use allNodes for grouping to detect all relationships, not just visible ones
  const families = groupNodesByFamily(allNodes, nodes)
  let currentIndex = 0
  const elements: JSX.Element[] = []
  
  families.forEach((familyNodes, familyId) => {
    // Only process families that have at least one visible node
    const visibleFamilyNodes = familyNodes.filter(node => 
      visibleNodes.some(vn => vn.id === node.id)
    )
    
    if (visibleFamilyNodes.length === 0) return // Skip if no visible nodes in pagination
    
    // Determine if this is a parent-child family
    const isFamily = !familyId.startsWith('standalone-') && !familyId.startsWith('orphan-')
    const isOrphan = familyId.startsWith('orphan-')
    const familyColor = isFamily || isOrphan ? 
      getFamilyColor(familyId.replace('orphan-', '')) : null

    // Check if family is expanded
    const isExpanded = !isFamily || expandedFamilies.has(familyId)
    
    // For families, if parent is visible, show whole family structure
    const nodesToShow = isFamily ? 
      (visibleFamilyNodes.some(n => n.id === familyNodes[0].id) ? // Parent is visible?
        (isExpanded ? familyNodes : [familyNodes[0]]) : // Show all or just parent
        visibleFamilyNodes) : // Otherwise only show visible members
      visibleFamilyNodes // Non-families: only show visible
    
    nodesToShow.forEach((node, nodeIndex) => {
      // Calculate depth and relationship properties
      const nodeDepth = getNodeDepth(node, nodes)
      const nodeHasChildren = hasChildren(node.id, nodes)
      const nodeChildren = getNodeChildren(node.id, nodes)
      const isParent = nodeHasChildren
      const isChild = nodeDepth > 0
      const parentNode = isChild ? getParentNode(node, nodes) : null
      const nodeIsExpanded = expandedNodes.has(node.id)
      
      // Calculate node relationship properties
      
      // For deep nesting: skip if any ancestor is collapsed
      if (nodeDepth > 0 && isFamily) {
        let currentNode = node
        let shouldSkip = false
        
        while (currentNode.parent) {
          const parent = nodes.find(n => n.id === currentNode.parent)
          if (parent && !expandedNodes.has(parent.id)) {
            shouldSkip = true
            break
          }
          currentNode = parent || currentNode
        }
        
        if (shouldSkip) return
      }
      
      elements.push(
        <MatrixNodeCard
          key={node.id}
          node={node}
          index={currentIndex++}
          isCollapsed={isCollapsedView}
          isContextMenuOpen={contextMenuNodeId === node.id}
          onContextMenu={onNodeContextMenu}
          onDoubleClick={onNodeDoubleClick}
          isParent={isParent}
          isChild={isChild}
          familyColor={familyColor}
          indentLevel={Math.min(nodeDepth, 5)} // Cap at 5 levels to prevent excessive indentation
          allNodes={nodes}
          parentNode={parentNode}
          isExpanded={nodeIsExpanded}
          onToggleExpand={isParent ? () => onToggleNode(node.id) : undefined}
          childCount={nodeChildren.length}
        />
      )
    })
    
    // Add spacing between families
    if (nodesToShow.length > 0) {
      elements.push(<div key={`spacer-${familyId}`} className="h-2" />)
    }
  })
  
  // Final summary for this quadrant
  const relationshipElements = elements.filter(el => 
    el.props?.isParent || el.props?.isChild
  ).length
  
  return <>{elements}</>
}