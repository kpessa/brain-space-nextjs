'use client'

import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, GitBranch, GitMerge, Circle, CheckCircle, Square, CheckSquare, Pin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useNodesStore } from '@/store/nodeStore'
import type { Node } from '@/types/node'
import { getNodeTypeIcon, getNodeTypeColor, getEisenhowerQuadrant } from '@/types/node'

interface NodeTreeItemProps {
  node: Node
  level: number
  onCreateChild?: (node: Node) => void
  onCreateParent?: (node: Node) => void
  onNodeClick?: (node: Node) => void
  expandedNodes: Set<string>
  onToggleExpand: (nodeId: string) => void
  selectMode?: boolean
  isSelected?: boolean
  onSelect?: (nodeId: string, selected: boolean) => void
  selectedNodes?: Set<string>
}

function NodeTreeItem({ 
  node, 
  level, 
  onCreateChild, 
  onCreateParent, 
  onNodeClick,
  expandedNodes,
  onToggleExpand,
  selectMode = false,
  isSelected = false,
  onSelect,
  selectedNodes
}: NodeTreeItemProps) {
  const { getNodeChildren, updateNode, toggleNodePin } = useNodesStore()
  const children = getNodeChildren(node.id)
  const hasChildren = children.length > 0
  const isExpanded = expandedNodes.has(node.id)

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      onToggleExpand(node.id)
    }
  }

  const handleCompletionToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateNode(node.id, { completed: !node.completed })
  }
  
  const handlePinToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await toggleNodePin(node.id)
  }

  const getQuadrantColor = (urgency?: number, importance?: number) => {
    const quadrant = getEisenhowerQuadrant(urgency, importance)
    switch (quadrant) {
      case 'do-first': return 'bg-red-100 text-red-700'
      case 'schedule': return 'bg-blue-100 text-blue-700'
      case 'delegate': return 'bg-yellow-100 text-yellow-700'
      case 'eliminate': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="select-none">
      <div 
        className={`
          flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer
          ${node.completed ? 'opacity-60' : ''}
          ${isSelected ? 'bg-brain-50 border-brain-200' : ''}
        `}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => !selectMode && onNodeClick?.(node)}
      >
        {/* Selection checkbox */}
        {selectMode && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect?.(node.id, !isSelected)
            }}
            className="flex-shrink-0"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-brain-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
          </button>
        )}
        
        {/* Expand/Collapse Icon */}
        <button
          onClick={handleToggleExpand}
          className={`flex-shrink-0 w-5 h-5 flex items-center justify-center ${!hasChildren ? 'invisible' : ''}`}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )
          )}
        </button>

        {/* Completion Checkbox */}
        {!selectMode && (
          <button
            onClick={handleCompletionToggle}
            className="flex-shrink-0"
          >
            {node.completed ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5 text-gray-400" />
            )}
          </button>
        )}

        {/* Node Icon */}
        <span className="text-lg flex-shrink-0">{getNodeTypeIcon(node.type)}</span>

        {/* Node Title */}
        <span className={`flex-1 ${node.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
          {node.title || 'Untitled'}
        </span>
        
        {/* Pin indicator */}
        {node.isPinned && (
          <Pin className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
        )}

        {/* Tags */}
        {node.tags && node.tags.length > 0 && (
          <div className="flex gap-1 flex-shrink-0">
            {node.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Eisenhower Quadrant */}
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getQuadrantColor(node.urgency, node.importance)}`}>
          {getEisenhowerQuadrant(node.urgency, node.importance).replace('-', ' ')}
        </span>

        {/* Node Type */}
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getNodeTypeColor(node.type)} bg-opacity-10`}>
          {node.type}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePinToggle}
            className="p-1"
            title={node.isPinned ? "Unpin node" : "Pin node"}
          >
            <Pin className={`w-3 h-3 ${node.isPinned ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onCreateChild?.(node)
            }}
            className="p-1"
            title="Add child node"
          >
            <GitBranch className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onCreateParent?.(node)
            }}
            className="p-1"
            title="Add parent node"
          >
            <GitMerge className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="ml-6 border-l border-gray-200">
          {children.map((child) => (
            <NodeTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onCreateChild={onCreateChild}
              onCreateParent={onCreateParent}
              onNodeClick={onNodeClick}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              selectMode={selectMode}
              isSelected={selectedNodes?.has(child.id) || false}
              onSelect={onSelect}
              selectedNodes={selectedNodes}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface NodeHierarchyViewProps {
  nodes: Node[]
  onCreateChild?: (node: Node) => void
  onCreateParent?: (node: Node) => void
  onNodeClick?: (node: Node) => void
  searchQuery?: string
  selectMode?: boolean
  selectedNodes?: Set<string>
  onNodeSelect?: (nodeId: string, selected: boolean) => void
}

export function NodeHierarchyView({
  nodes,
  onCreateChild,
  onCreateParent,
  onNodeClick,
  searchQuery = '',
  selectMode = false,
  selectedNodes = new Set<string>(),
  onNodeSelect
}: NodeHierarchyViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [showAllAsRoots, setShowAllAsRoots] = useState(false)
  const { getNodeChildren } = useNodesStore()

  // Build tree structure - find root nodes (nodes without parents)
  const rootNodes = useMemo(() => {
    if (showAllAsRoots) {

      return nodes
    }
    
    // Check nodes with parents
    
    const roots = nodes.filter(node => {
      // Node is a root if:
      // 1. It has no parent (null, undefined, or empty string)
      // 2. Its parent doesn't exist in the current nodes list
      if (!node.parent || node.parent === null || node.parent === '') {
        return true
      }
      // Check if parent exists
      const parentExists = nodes.some(n => n.id === node.parent)
      return !parentExists
    })
    // Root nodes identified
    
    return roots
  }, [nodes, showAllAsRoots])

  // Separate pinned and unpinned nodes
  const { pinnedNodes, unpinnedRootNodes } = useMemo(() => {
    const pinned = nodes.filter(node => node.isPinned)
    const unpinnedRoots = rootNodes.filter(node => !node.isPinned)
    return { pinnedNodes: pinned, unpinnedRootNodes: unpinnedRoots }
  }, [nodes, rootNodes])

  // Filter nodes based on search
  const { filteredPinnedNodes, filteredRootNodes } = useMemo(() => {
    if (!searchQuery) {
      return { 
        filteredPinnedNodes: pinnedNodes,
        filteredRootNodes: unpinnedRootNodes 
      }
    }

    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = (node: Node): boolean => {
      // Check if node matches
      const nodeMatches = 
        node.title?.toLowerCase().includes(searchLower) ||
        node.description?.toLowerCase().includes(searchLower) ||
        node.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      
      if (nodeMatches) return true

      // Check if any children match
      const children = getNodeChildren(node.id)
      return children.some(child => matchesSearch(child))
    }

    return {
      filteredPinnedNodes: pinnedNodes.filter(matchesSearch),
      filteredRootNodes: unpinnedRootNodes.filter(matchesSearch)
    }
  }, [pinnedNodes, unpinnedRootNodes, searchQuery, getNodeChildren])

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const expandAll = () => {
    const allNodeIds = nodes.map(n => n.id)
    setExpandedNodes(new Set(allNodeIds))
  }

  const collapseAll = () => {
    setExpandedNodes(new Set())
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Node Hierarchy</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={showAllAsRoots ? "primary" : "outline"}
              onClick={() => setShowAllAsRoots(!showAllAsRoots)}
              className="text-xs"
            >
              {showAllAsRoots ? "Show Hierarchy" : "Show All Flat"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={expandAll}
              className="text-xs"
            >
              Expand All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={collapseAll}
              className="text-xs"
            >
              Collapse All
            </Button>
          </div>
        </div>
      </div>

      {/* Tree */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {filteredRootNodes.length === 0 && filteredPinnedNodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No nodes match your search' : 'No nodes found'}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pinned Nodes Section */}
            {filteredPinnedNodes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Pin className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <p className="text-sm font-medium text-gray-700">Pinned Nodes ({filteredPinnedNodes.length})</p>
                </div>
                <div className="space-y-1 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  {filteredPinnedNodes.map((node) => (
                    <div key={node.id} className="group relative">
                      <NodeTreeItem
                        node={node}
                        level={0}
                        onCreateChild={onCreateChild}
                        onCreateParent={onCreateParent}
                        onNodeClick={onNodeClick}
                        expandedNodes={expandedNodes}
                        onToggleExpand={toggleExpand}
                        selectMode={selectMode}
                        isSelected={selectedNodes.has(node.id)}
                        onSelect={onNodeSelect}
                        selectedNodes={selectedNodes}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Regular Nodes Section */}
            {filteredRootNodes.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  {showAllAsRoots ? 'All nodes:' : 'Root nodes (no parent):'}
                </p>
                <div className="space-y-1">
                  {filteredRootNodes.map((node) => (
                    <div key={node.id} className="group relative">
                      <div className="absolute left-0 top-2 w-1 h-6 bg-brain-500 rounded-r opacity-50"></div>
                      <NodeTreeItem
                        node={node}
                        level={0}
                        onCreateChild={onCreateChild}
                        onCreateParent={onCreateParent}
                        onNodeClick={onNodeClick}
                        expandedNodes={expandedNodes}
                        onToggleExpand={toggleExpand}
                        selectMode={selectMode}
                        isSelected={selectedNodes.has(node.id)}
                        onSelect={onNodeSelect}
                        selectedNodes={selectedNodes}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}