import { useState, useMemo } from 'react'
import { type Node, type NodeType } from '@/types/node'
import { shouldShowNode } from '@/store/userPreferencesStore'

export function useTimeboxFilters(
  nodes: Node[], 
  timeSlots: any[], 
  currentMode: string,
  hidePersonalInWorkMode: boolean,
  hideWorkInPersonalMode: boolean
) {
  const [nodeFilterMode, setNodeFilterMode] = useState<'filtered' | 'all'>('filtered')
  const [selectedNodeType, setSelectedNodeType] = useState<NodeType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Get unscheduled nodes with filtering
  const unscheduledNodes = useMemo(() => {
    let filteredNodes = nodes.filter(node => 
      !node.completed && 
      !timeSlots.some(slot => 
        slot.tasks.some((task: any) => task.nodeId === node.id)
      )
    )
    
    // Apply mode-based filtering (work/personal/all)
    if (nodeFilterMode === 'filtered') {
      filteredNodes = filteredNodes.filter(node => 
        shouldShowNode(node.tags, node.isPersonal, currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode)
      )
    }
    
    // Apply node type filtering
    if (selectedNodeType !== 'all') {
      filteredNodes = filteredNodes.filter(node => node.type === selectedNodeType)
    }
    
    // Apply search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredNodes = filteredNodes.filter(node => 
        (node.title?.toLowerCase().includes(query)) ||
        (node.description?.toLowerCase().includes(query)) ||
        (node.tags?.some(tag => tag.toLowerCase().includes(query))) ||
        (node.type?.toLowerCase().includes(query))
      )
    }
    
    return filteredNodes
  }, [nodes, timeSlots, nodeFilterMode, currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode, selectedNodeType, searchQuery])

  // Get all node types present in unscheduled nodes for filter dropdown
  const availableNodeTypes = useMemo(() => {
    const types = new Set<NodeType>()
    nodes.filter(node => 
      !node.completed && 
      !timeSlots.some(slot => 
        slot.tasks.some((task: any) => task.nodeId === node.id)
      )
    ).forEach(node => {
      if (node.type) types.add(node.type)
    })
    return Array.from(types).sort()
  }, [nodes, timeSlots])

  const clearFilters = () => {
    setNodeFilterMode('all')
    setSelectedNodeType('all')
    setSearchQuery('')
  }

  return {
    nodeFilterMode,
    setNodeFilterMode,
    selectedNodeType,
    setSelectedNodeType,
    searchQuery,
    setSearchQuery,
    unscheduledNodes,
    availableNodeTypes,
    clearFilters
  }
}
