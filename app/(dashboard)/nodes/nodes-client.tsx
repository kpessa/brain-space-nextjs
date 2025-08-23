'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Card, CardContent } from '@/components/ui/Card'
import { useNodesStore } from '@/store/nodes'
import { createAIService } from '@/services/ai'
import type { Node, NodeType } from '@/types/node'
import { getNodeTypeColor, getNodeTypeIcon, getEisenhowerQuadrant } from '@/types/node'
import { AIProviderSelector } from '@/components/AIProviderSelector'
// Import extracted components
import { NodeCreateModal } from '@/components/nodes/NodeCreateModal'
import { BulkLinkModal } from '@/components/nodes/NodeBulkOperations'
import { NodeStats } from '@/components/nodes/NodeStats'
import { NodeFilters } from '@/components/nodes/NodeFilters'
import { NodeCard } from '@/components/nodes/NodeCard'

// Dynamic imports for heavy components to reduce bundle size
import dynamic from 'next/dynamic'

const NodeRelationshipModal = dynamic(() => import('@/components/nodes/NodeRelationshipModal').then(mod => ({ default: mod.NodeRelationshipModal })), { ssr: false })
const NodeHierarchyView = dynamic(() => import('@/components/nodes/NodeHierarchyView').then(mod => ({ default: mod.NodeHierarchyView })), { ssr: false })
const NodeGraphView = dynamic(() => import('@/components/nodes/LazyNodeGraphView').then(mod => ({ default: mod.LazyNodeGraphView })), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading graph...</p>
    </div>
  )
})
const NodeDetailModal = dynamic(() => import('@/components/nodes/NodeDetailModal').then(mod => ({ default: mod.NodeDetailModal })), { ssr: false })
const UpdateExportModal = dynamic(() => import('@/components/nodes/UpdateExportModal').then(mod => ({ default: mod.UpdateExportModal })), { ssr: false })
const BulkTagModal = dynamic(() => import('@/components/nodes/BulkTagModal').then(mod => ({ default: mod.BulkTagModal })), { ssr: false })
const BulkNodeCreationDialog = dynamic(() => import('@/components/nodes/BulkNodeCreationDialog').then(mod => ({ default: mod.BulkNodeCreationDialog })), { ssr: false })
import { useUserPreferencesStore, shouldShowNode } from '@/store/userPreferencesStore'
import { ModeToggle } from '@/components/ModeToggle'
import { 
  Network, 
  Plus, 
  Search, 
  Zap, 
  Tag,
  Target,
  Download,
  Upload,
  Grid3x3,
  TreePine,
  Share2,
  CheckSquare,
  LinkIcon,
  Calendar,
  FileText,
  Mic,
  GitBranch,
  Trash2,
  CheckCircle
} from '@/lib/icons'
import dayjs from '@/lib/dayjs'
const StandupSummaryDialog = dynamic(() => import('@/components/StandupSummaryDialog'), { ssr: false })
const BulkScheduleImportModal = dynamic(() => import('@/components/BulkScheduleImportModal').then(mod => ({ default: mod.BulkScheduleImportModal })), { ssr: false })
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function NodesClient({ userId }: { userId: string }) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<NodeType | 'all'>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'tree' | 'graph'>('grid')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [showCompleted, setShowCompleted] = useState(false)
  const [showSnoozed, setShowSnoozed] = useState(false)
  const [relationshipModal, setRelationshipModal] = useState<{
    isOpen: boolean
    sourceNode: Node | null
    type: 'child' | 'parent'
  }>({ isOpen: false, sourceNode: null, type: 'child' })
  const [bulkLinkModalOpen, setBulkLinkModalOpen] = useState(false)
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false)
  const [nodeDetailModal, setNodeDetailModal] = useState<{
    isOpen: boolean
    node: Node | null
  }>({ isOpen: false, node: null })
  const [showExportModal, setShowExportModal] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  
  const nodes = useNodesStore(state => state.nodes)
  const isLoading = useNodesStore(state => state.isLoading)
  const loadNodes = useNodesStore(state => state.loadNodes)
  const deleteNode = useNodesStore(state => state.deleteNode)
  const getActiveSnoozedCount = useNodesStore(state => state.getActiveSnoozedCount)
  const { currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode } = useUserPreferencesStore()

  // Load nodes on mount - loadNodes is excluded from deps to prevent infinite loop
  useEffect(() => {
    loadNodes(userId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Filter nodes based on search and filters
  const filteredNodes = nodes.filter(node => {
    // Check if node is snoozed
    if (node.snoozedUntil) {
      const now = new Date()
      const snoozeEnd = new Date(node.snoozedUntil)
      if (now < snoozeEnd && !showSnoozed) {
        return false // Node is snoozed and we're not showing snoozed nodes
      }
    }
    
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

  // Get unique tags
  const allTags = Array.from(new Set(nodes.flatMap(node => node.tags || []))).sort()

  // Handlers for relationship creation
  const handleCreateChild = (parentNode: Node) => {
    setRelationshipModal({
      isOpen: true,
      sourceNode: parentNode,
      type: 'child'
    })
  }

  const handleCreateParent = (childNode: Node) => {
    setRelationshipModal({
      isOpen: true,
      sourceNode: childNode,
      type: 'parent'
    })
  }

  const closeRelationshipModal = () => {
    setRelationshipModal({
      isOpen: false,
      sourceNode: null,
      type: 'child'
    })
  }

  // Selection handlers
  const handleNodeSelect = (nodeId: string, selected: boolean) => {
    setSelectedNodes(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(nodeId)
      } else {
        next.delete(nodeId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedNodes(new Set(filteredNodes.map(n => n.id)))
  }

  const handleDeselectAll = () => {
    setSelectedNodes(new Set())
  }

  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    if (selectMode) {
      // Exiting select mode, clear selections
      setSelectedNodes(new Set())
    }
  }

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedNodes.size === 0) return
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedNodes.size} nodes?`)
    if (!confirmed) return

    for (const nodeId of selectedNodes) {
      await deleteNode(nodeId)
    }
    
    setSelectedNodes(new Set())
    setSelectMode(false)
  }

  const handleBulkLinkAsChildren = () => {
    if (selectedNodes.size === 0) {
      alert('Please select at least one node to link')
      return
    }
    
    setBulkLinkModalOpen(true)
  }

  const handleBulkTagOperations = () => {
    if (selectedNodes.size === 0) {
      alert('Please select at least one node to modify tags')
      return
    }
    
    setBulkTagModalOpen(true)
  }

  // Export nodes to JSON
  const exportNodes = () => {
    const dataStr = JSON.stringify(nodes, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
    const exportFileDefaultName = `brain-space-nodes-${dayjs().format('YYYY-MM-DD')}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Handle node click in tree view
  const handleNodeClick = (node: Node) => {
    setNodeDetailModal({ isOpen: true, node })
  }
  
  const closeNodeDetailModal = () => {
    setNodeDetailModal({ isOpen: false, node: null })
  }
  
  // Import nodes from JSON
  const importNodes = async (event: React.ChangeEvent<HTMLInputElement>) => {
    
    const file = event.target.files?.[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const importedNodes = JSON.parse(text) as Node[]
      
      // Import each node
      for (const node of importedNodes) {
        const { id: _id, userId: _userId, ...nodeData } = node
        await useNodesStore.getState().createNode({
          ...nodeData,
          userId: userId,
        })
      }
      
      await loadNodes(userId)
      alert(`Successfully imported ${importedNodes.length} nodes`)
    } catch (error) {
      // Failed to import nodes
      alert('Failed to import nodes. Please check the file format.')
    }
    
    // Reset input
    event.target.value = ''
  }

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brain-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading nodes...</p>
          </div>
        </div>
    )
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 min-h-screen flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Node Management Error</h2>
            <p className="text-gray-600 mb-4">Something went wrong while managing your nodes. Please refresh the page to continue.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-brain-600 text-white rounded-lg hover:bg-brain-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 min-h-screen">
        <div className="max-w-7xl mx-auto overflow-x-hidden">
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Network className="w-12 h-12 text-primary-foreground" />
                <div>
                  <h1 className="text-4xl font-bold text-primary-foreground">My Nodes</h1>
                  <p className="text-primary-foreground/80 text-lg">
                    Organize your thoughts, tasks, and ideas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Select Mode Toggle */}
                <Button
                  variant="outline"
                  onClick={toggleSelectMode}
                  className={`flex items-center gap-2 ${
                    selectMode 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary' 
                      : 'bg-background/10 border-background/20 text-primary-foreground hover:bg-background/20'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  {selectMode ? 'Exit Select' : 'Select'}
                </Button>
                
                {/* Import */}
                <label className="cursor-pointer">
                  <input type="file" accept=".json" onChange={importNodes} className="hidden" />
                  <Button variant="outline" className="flex items-center gap-2 bg-background/10 border-background/20 text-primary-foreground hover:bg-background/20">
                    <Upload className="w-4 h-4" />
                    Import
                  </Button>
                </label>
                
                {/* Export */}
                <Button
                  variant="outline"
                  onClick={exportNodes}
                  className="flex items-center gap-2 bg-background/10 border-background/20 text-primary-foreground hover:bg-background/20"
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                
                {/* Export Updates */}
                <Button
                  variant="outline"
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 bg-background/10 border-background/20 text-primary-foreground hover:bg-background/20"
                >
                  <FileText className="w-4 h-4" />
                  Export Updates
                </Button>
                
                {/* Bulk Import */}
                <Button
                  variant="outline"
                  onClick={() => setShowBulkImportModal(true)}
                  className="flex items-center gap-2 bg-background/10 border-background/20 text-primary-foreground hover:bg-background/20"
                >
                  <Calendar className="w-4 h-4" />
                  Bulk Import
                </Button>
                
                {/* Daily Standup (Work Mode Only) */}
                {currentMode === 'work' && (
                  <StandupSummaryDialog
                    trigger={
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 bg-background/10 border-background/20 text-primary-foreground hover:bg-background/20"
                      >
                        <Mic className="w-4 h-4" />
                        Daily Standup
                      </Button>
                    }
                  />
                )}
                
                {/* Add Node Buttons */}
                <Button
                  onClick={() => setIsBulkCreateOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                  title="Create multiple nodes with hierarchy"
                >
                  <GitBranch className="w-5 h-5" />
                  Bulk Create
                </Button>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Node
                </Button>
              </div>
            </div>
            
            {/* AI Provider Selector and Mode Toggle */}
            <div className="mt-4 flex justify-between items-center">
              <ModeToggle />
              <AIProviderSelector />
            </div>
          </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-brain-100 rounded-lg flex items-center justify-center">
                  <Network className="w-4 h-4 text-brain-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Nodes</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredNodes.length}</p>
                  {currentMode !== 'all' && (
                    <p className="text-xs text-gray-500">{currentMode} mode</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {nodes.filter(n => n.completed).length}
                  </p>
                  {!showCompleted && nodes.filter(n => n.completed).length > 0 && (
                    <p className="text-xs text-gray-500">Hidden</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredNodes.filter(n => n.type === 'task').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Tag className="w-4 h-4 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tags</p>
                  <p className="text-2xl font-bold text-gray-900">{allTags.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search nodes..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                {/* View Mode Toggle */}
                <div className="flex rounded-lg border border-gray-300">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 flex items-center gap-2 rounded-l-lg transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-brain-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                    <span className="text-sm">Grid</span>
                  </button>
                  <button
                    onClick={() => setViewMode('tree')}
                    className={`px-3 py-2 flex items-center gap-2 transition-colors ${
                      viewMode === 'tree' 
                        ? 'bg-brain-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <TreePine className="w-4 h-4" />
                    <span className="text-sm">Tree</span>
                  </button>
                  <button
                    onClick={() => setViewMode('graph')}
                    className={`px-3 py-2 flex items-center gap-2 rounded-r-lg transition-colors ${
                      viewMode === 'graph' 
                        ? 'bg-brain-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm">Graph</span>
                  </button>
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as NodeType | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="goal">Goals</option>
                  <option value="project">Projects</option>
                  <option value="task">Tasks</option>
                  <option value="idea">Ideas</option>
                  <option value="question">Questions</option>
                  <option value="problem">Problems</option>
                  <option value="insight">Insights</option>
                  <option value="thought">Thoughts</option>
                  <option value="concern">Concerns</option>
                </select>
                
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>#{tag}</option>
                  ))}
                </select>
                
                {/* Show Completed Toggle */}
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  <input
                    type="checkbox"
                    id="showCompleted"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="rounded border-gray-300 text-brain-600 focus:ring-brain-500"
                  />
                  <label htmlFor="showCompleted" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                    Show completed
                  </label>
                </div>
                
                {/* Show Snoozed Toggle */}
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  <input
                    type="checkbox"
                    id="showSnoozed"
                    checked={showSnoozed}
                    onChange={(e) => setShowSnoozed(e.target.checked)}
                    className="rounded border-gray-300 text-brain-600 focus:ring-brain-500"
                  />
                  <label htmlFor="showSnoozed" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                    Show snoozed ({getActiveSnoozedCount()})
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Toolbar */}
        {selectMode && selectedNodes.size > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedNodes.size} node{selectedNodes.size > 1 ? 's' : ''} selected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAll}
                    className="text-xs"
                  >
                    Select All ({filteredNodes.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeselectAll}
                    className="text-xs"
                  >
                    Deselect All
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkTagOperations}
                    className="flex items-center gap-1"
                  >
                    <Tag className="w-4 h-4" />
                    Bulk Tags
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkLinkAsChildren}
                    className="flex items-center gap-1"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Link as Children
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nodes Display - Grid, Tree, or Graph */}
        {viewMode === 'grid' ? (
          // Grid View
          filteredNodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNodes
                .sort((a, b) => {
                  // Sort pinned nodes first
                  if (a.isPinned && !b.isPinned) return -1
                  if (!a.isPinned && b.isPinned) return 1
                  // Then by priority (urgency + importance)
                  const priorityA = (a.urgency || 0) + (a.importance || 0)
                  const priorityB = (b.urgency || 0) + (b.importance || 0)
                  return priorityB - priorityA
                })
                .map((node) => (
                  <NodeCard 
                    key={node.id} 
                    node={node} 
                    onCreateChild={handleCreateChild}
                    onCreateParent={handleCreateParent}
                    onNodeClick={handleNodeClick}
                    isSelected={selectedNodes.has(node.id)}
                    onSelect={handleNodeSelect}
                    selectMode={selectMode}
                    userId={userId}
                    userName="Me"
                  />
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-brain-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Network className="w-8 h-8 text-brain-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No nodes found</h3>
                <p className="text-gray-500 mb-4">
                  {nodes.length === 0 
                    ? "Create your first node to start organizing your thoughts with AI assistance."
                    : "Try adjusting your search or filters."}
                </p>
                {nodes.length === 0 && (
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    variant="primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Node
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        ) : viewMode === 'tree' ? (
          // Tree View
          <NodeHierarchyView
            nodes={filteredNodes}
            onCreateChild={handleCreateChild}
            onCreateParent={handleCreateParent}
            onNodeClick={handleNodeClick}
            searchQuery={searchQuery}
            selectMode={selectMode}
            selectedNodes={selectedNodes}
            onNodeSelect={handleNodeSelect}
          />
        ) : (
          // Graph View
          <Card>
            <CardContent className="p-0">
              <NodeGraphView
                nodes={filteredNodes}
                onCreateChild={handleCreateChild}
                onCreateParent={handleCreateParent}
              />
            </CardContent>
          </Card>
        )}

        <NodeCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          userId={userId}
        />
        
        <BulkNodeCreationDialog
          isOpen={isBulkCreateOpen}
          onClose={() => setIsBulkCreateOpen(false)}
          userId={userId}
        />
        
        {relationshipModal.sourceNode && (
          <NodeRelationshipModal
            isOpen={relationshipModal.isOpen}
            onClose={closeRelationshipModal}
            sourceNode={relationshipModal.sourceNode}
            relationshipType={relationshipModal.type}
          />
        )}
        
        <BulkLinkModal
          isOpen={bulkLinkModalOpen}
          onClose={() => {
            setBulkLinkModalOpen(false)
            setSelectedNodes(new Set())
            setSelectMode(false)
          }}
          selectedNodes={selectedNodes}
          nodes={nodes}
        />
        
        {nodeDetailModal.node && (
          <NodeDetailModal
            isOpen={nodeDetailModal.isOpen}
            onClose={closeNodeDetailModal}
            node={nodeDetailModal.node}
            userId={userId}
            userName="Me"
            onCreateChild={handleCreateChild}
            onCreateParent={handleCreateParent}
            onRelationshipChange={() => {
              // Force reload nodes to update tree view
              loadNodes(userId)
            }}
          />
        )}
        
        <UpdateExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />
        
        <BulkTagModal
          isOpen={bulkTagModalOpen}
          onClose={() => {
            setBulkTagModalOpen(false)
            setSelectedNodes(new Set())
            setSelectMode(false)
          }}
          selectedNodeIds={selectedNodes}
        />
        
        <BulkScheduleImportModal
          isOpen={showBulkImportModal}
          onClose={() => {
            setShowBulkImportModal(false)
            // Reload nodes to show newly imported ones
            loadNodes(userId)
          }}
          userId={userId}
        />
        </div>
      </div>
    </ErrorBoundary>
  )
}