'use client'

import { useState, useEffect, useMemo } from 'react'
import { useNodesStore } from '@/store/nodeStore'
import { useUserPreferencesStore, shouldShowNode } from '@/store/userPreferencesStore'
import type { Node, NodeType } from '@/types/node'

interface UseNodesLogicProps {
  userId: string
}

export function useNodesLogic({ userId }: UseNodesLogicProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<NodeType | 'all'>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'tree' | 'graph'>('grid')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [showCompleted, setShowCompleted] = useState(false)
  
  // Store state
  const nodes = useNodesStore(state => state.nodes)
  const isLoading = useNodesStore(state => state.isLoading)
  const loadNodes = useNodesStore(state => state.loadNodes)
  const deleteNode = useNodesStore(state => state.deleteNode)
  const { currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode } = useUserPreferencesStore()

  // Load nodes on mount
  useEffect(() => {
    loadNodes(userId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Filter nodes based on search and filters
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      // First check if node should be shown based on mode
      if (!shouldShowNode(node.tags, node.isPersonal, currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode)) {
        return false
      }
      
      // Filter out completed nodes if showCompleted is false
      if (!showCompleted && node.completed) {
        return false
      }
      
      const matchesSearch = !searchQuery || 
        node.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesType = selectedType === 'all' || node.type === selectedType
      const matchesTag = selectedTag === 'all' || node.tags?.includes(selectedTag)
      
      return matchesSearch && matchesType && matchesTag
    })
  }, [nodes, searchQuery, selectedType, selectedTag, showCompleted, currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode])

  // Get unique tags from all nodes
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>()
    nodes.forEach(node => {
      node.tags?.forEach(tag => tagsSet.add(tag))
    })
    return Array.from(tagsSet).sort()
  }, [nodes])

  // Get tree structure for tree view
  const treeNodes = useMemo(() => {
    return filteredNodes.filter(node => !node.parent)
  }, [filteredNodes])

  // Selection handlers
  const handleSelectAll = () => {
    const allNodeIds = new Set(filteredNodes.map(n => n.id))
    setSelectedNodes(allNodeIds)
  }

  const handleClearSelection = () => {
    setSelectedNodes(new Set())
  }

  const handleToggleSelect = (nodeId: string) => {
    const newSelection = new Set(selectedNodes)
    if (newSelection.has(nodeId)) {
      newSelection.delete(nodeId)
    } else {
      newSelection.add(nodeId)
    }
    setSelectedNodes(newSelection)
  }

  const handleDeleteSelected = async () => {
    if (selectedNodes.size === 0) return
    
    const confirmMessage = selectedNodes.size === 1
      ? 'Are you sure you want to delete this node?'
      : `Are you sure you want to delete ${selectedNodes.size} nodes?`
    
    if (confirm(confirmMessage)) {
      // Delete nodes one by one
      for (const nodeId of selectedNodes) {
        await deleteNode(nodeId)
      }
      setSelectedNodes(new Set())
      setSelectMode(false)
    }
  }

  return {
    // State
    nodes: filteredNodes,
    treeNodes,
    isLoading,
    searchQuery,
    selectedType,
    selectedTag,
    viewMode,
    selectMode,
    selectedNodes,
    showCompleted,
    availableTags,
    
    // Setters
    setSearchQuery,
    setSelectedType,
    setSelectedTag,
    setViewMode,
    setSelectMode,
    setSelectedNodes,
    setShowCompleted,
    
    // Handlers
    handleSelectAll,
    handleClearSelection,
    handleToggleSelect,
    handleDeleteSelected,
    deleteNode
  }
}