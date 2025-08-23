'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useNodesStore } from '@/store/nodeStore'
import { useUserPreferencesStore } from '@/store/userPreferencesStore'
import { ModeToggle } from '@/components/ModeToggle'
import { AlertCircle, Star, Clock, Calendar, Maximize2, Minimize2 } from '@/lib/icons'
import { InputDialog } from '@/components/ui/InputDialog'
import { Button } from '@/components/ui/Button'
import { NodeContextMenu } from '@/components/matrix/NodeContextMenu'
import { QuadrantCard } from '@/components/matrix/QuadrantCard'
import { MatrixQuadrantRenderer } from '@/components/matrix/MatrixQuadrantRenderer'
import { useMatrixState } from '@/hooks/useMatrixState'
import { useMatrixOrganization } from '@/hooks/useMatrixOrganization'
import { useMatrixHandlers } from '@/hooks/useMatrixHandlers'
import { NodeDetailModal } from '@/components/nodes/NodeDetailModal'
import type { Node } from '@/types/node'

// Dynamic import for drag and drop to avoid SSR issues
const DragDropContext = dynamic(() => import('@hello-pangea/dnd').then(mod => ({ default: mod.DragDropContext })), { ssr: false })

interface Quadrant {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

const quadrants: Quadrant[] = [
  {
    id: 'urgent-important',
    title: 'Do First',
    description: 'Urgent & Important',
    icon: <AlertCircle className="w-5 h-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    id: 'not-urgent-important',
    title: 'Schedule',
    description: 'Not Urgent & Important',
    icon: <Star className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'urgent-not-important',
    title: 'Delegate',
    description: 'Urgent & Not Important',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  {
    id: 'not-urgent-not-important',
    title: 'Eliminate',
    description: 'Not Urgent & Not Important',
    icon: <Calendar className="w-5 h-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
]

export default function MatrixClient({ userId }: { userId: string }) {
  const { nodes, isLoading: loading, error, loadNodes, updateNode, createNode, deleteNode, snoozeNode, unsnoozeNode, createChildNode } = useNodesStore()
  const { currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode } = useUserPreferencesStore()
  
  // State for NodeDetailModal
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  
  // Use custom hooks for state management
  const {
    quadrantNodes,
    setQuadrantNodes,
    showAddDialog,
    setShowAddDialog,
    selectedQuadrant,
    setSelectedQuadrant,
    visibleCounts,
    expandedGroups,
    expandedFamilies,
    expandedNodes,
    isCollapsedView,
    setIsCollapsedView,
    contextMenu,
    setContextMenu,
    handleLoadMore,
    toggleGroup,
    toggleFamily,
    toggleNode,
  } = useMatrixState()
  
  // Use custom hook for organizing nodes
  useMatrixOrganization({
    nodes,
    currentMode,
    hidePersonalInWorkMode,
    hideWorkInPersonalMode,
    setQuadrantNodes,
  })
  
  // Use custom hook for handlers
  const {
    handleDragEnd,
    handleAddTask,
    createTestRelationships,
    handleNodeContextMenu,
    handleNodeContextMenuClose,
    handleUpdateNode,
    handleDeleteNode,
    handleSnoozeNode,
    handleUnsnoozeNode,
  } = useMatrixHandlers({
    nodes,
    currentMode,
    userId,
    updateNode,
    createNode,
    deleteNode,
    snoozeNode,
    unsnoozeNode,
    createChildNode,
    setShowAddDialog,
    setSelectedQuadrant,
    setContextMenu,
  })
  
  // Handler to open detail modal
  const handleOpenDetailModal = (node: Node) => {
    setSelectedNode(node)
    setShowDetailModal(true)
    handleNodeContextMenuClose()
  }
  
  // Handler for double-click on node
  const handleNodeDoubleClick = (node: any) => {
    setSelectedNode(node)
    setShowDetailModal(true)
  }

  useEffect(() => {
    loadNodes(userId)
  }, [userId, loadNodes])

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brain-600"></div>
        </div>
    )
  }

  if (error) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">Error: {error}</div>
        </div>
    )
  }

  return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 min-h-[calc(100vh-4rem)]">
          <div className="max-w-7xl mx-auto">
            <header className="mb-8">
              <div className="text-center mb-4">
                <h1 className="text-4xl font-bold text-white mb-2">Eisenhower Matrix</h1>
                <p className="text-white/80 text-lg">
                  Prioritize your tasks by urgency and importance
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <ModeToggle />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCollapsedView(!isCollapsedView)}
                  className="flex items-center gap-2"
                >
                  {isCollapsedView ? (
                    <>
                      <Maximize2 className="w-4 h-4" />
                      Expand View
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-4 h-4" />
                      Compact View
                    </>
                  )}
                </Button>
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={createTestRelationships}
                    className="flex items-center gap-2 text-blue-600"
                  >
                    🔧 Create Test Data
                  </Button>
                )}
              </div>
            </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quadrants.map((quadrant) => {
              const allNodes = quadrantNodes[quadrant.id]
              const visibleCount = visibleCounts[quadrant.id]
              const visibleNodes = allNodes.slice(0, visibleCount)
              const remainingCount = allNodes.length - visibleCount
              const isDoFirst = quadrant.id === 'urgent-important'
              
              return (
                <QuadrantCard
                  key={quadrant.id}
                  quadrant={quadrant}
                  totalNodes={allNodes.length}
                  visibleCount={visibleCount}
                  remainingCount={remainingCount}
                  onAddClick={() => {
                    setSelectedQuadrant(quadrant.id)
                    setShowAddDialog(true)
                  }}
                  onLoadMore={() => handleLoadMore(quadrant.id)}
                >
                  <MatrixQuadrantRenderer
                    quadrantId={quadrant.id}
                    allNodes={allNodes}
                    visibleNodes={visibleNodes}
                    nodes={nodes}
                    isDoFirst={isDoFirst}
                    isCollapsedView={isCollapsedView}
                    expandedGroups={expandedGroups}
                    expandedFamilies={expandedFamilies}
                    expandedNodes={expandedNodes}
                    contextMenuNodeId={contextMenu.node?.id}
                    onToggleGroup={toggleGroup}
                    onToggleFamily={toggleFamily}
                    onToggleNode={toggleNode}
                    onNodeContextMenu={handleNodeContextMenu}
                    onNodeDoubleClick={handleNodeDoubleClick}
                  />
                </QuadrantCard>
              )
            })}
          </div>

          <InputDialog
            isOpen={showAddDialog}
            title="Add New Task"
            placeholder="Enter task title..."
            onSubmit={(title) => handleAddTask(title, selectedQuadrant)}
            onCancel={() => {
              setShowAddDialog(false)
              setSelectedQuadrant('')
            }}
          />
          
          <NodeContextMenu
            isOpen={contextMenu.isOpen}
            position={contextMenu.position}
            node={contextMenu.node}
            onClose={handleNodeContextMenuClose}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onSnoozeNode={handleSnoozeNode}
            onUnsnoozeNode={handleUnsnoozeNode}
            onOpenDetailModal={handleOpenDetailModal}
          />
          
          {selectedNode && (
            <NodeDetailModal
              isOpen={showDetailModal}
              onClose={() => {
                setShowDetailModal(false)
                setSelectedNode(null)
                // Reload nodes to reflect any updates
                loadNodes(userId)
              }}
              node={selectedNode}
              userId={userId}
              userName="User"
            />
          )}
          </div>
        </div>
      </DragDropContext>
  )
}