import { DropResult } from '@hello-pangea/dnd'

interface UseMatrixHandlersProps {
  nodes: any[]
  currentMode: 'work' | 'personal'
  userId: string
  updateNode: (id: string, updates: any) => Promise<void>
  createNode: (node: any) => Promise<string | undefined>
  deleteNode: (id: string) => Promise<void>
  snoozeNode: (id: string, until: Date) => Promise<void>
  unsnoozeNode: (id: string) => Promise<void>
  createChildNode: (parentId: string, node: any) => Promise<string | undefined>
  setShowAddDialog: (show: boolean) => void
  setSelectedQuadrant: (quadrant: string) => void
  setContextMenu: (state: any) => void
}

export function useMatrixHandlers({
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
}: UseMatrixHandlersProps) {
  
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const sourceQuadrant = result.source.droppableId
    const destQuadrant = result.destination.droppableId
    const nodeId = result.draggableId

    if (sourceQuadrant === destQuadrant) return

    // Find the node
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    // Calculate new urgency and importance based on destination quadrant
    let newUrgency = node.urgency || 5
    let newImportance = node.importance || 5

    switch (destQuadrant) {
      case 'urgent-important':
        newUrgency = 8
        newImportance = 8
        break
      case 'not-urgent-important':
        newUrgency = 3
        newImportance = 8
        break
      case 'urgent-not-important':
        newUrgency = 8
        newImportance = 3
        break
      case 'not-urgent-not-important':
        newUrgency = 3
        newImportance = 3
        break
    }

    // Update the node
    await updateNode(nodeId, {
      urgency: newUrgency,
      importance: newImportance,
    })
  }

  const handleAddTask = async (title: string, selectedQuadrant: string) => {
    if (!selectedQuadrant) return

    // Set urgency and importance based on quadrant
    let urgency = 5
    let importance = 5

    switch (selectedQuadrant) {
      case 'urgent-important':
        urgency = 8
        importance = 8
        break
      case 'not-urgent-important':
        urgency = 3
        importance = 8
        break
      case 'urgent-not-important':
        urgency = 8
        importance = 3
        break
      case 'not-urgent-not-important':
        urgency = 3
        importance = 3
        break
    }

    await createNode({
      userId: userId,
      title,
      type: 'task',
      urgency,
      importance,
      isPersonal: currentMode === 'personal',
    })

    setShowAddDialog(false)
    setSelectedQuadrant('')
  }
  
  // Debug function to create test relationships
  const createTestRelationships = async () => {
    console.log('📝 Creating test parent-child relationships...')
    
    try {
      // Create a parent task
      const parentId = await createNode({
        userId,
        title: 'Plan Vacation (Parent Task)',
        type: 'project',
        urgency: 8,
        importance: 7,
        isPersonal: currentMode === 'personal'
      })
      
      if (parentId) {
        // Create child tasks
        await createChildNode(parentId, {
          title: 'Book Flights (Child 1)',
          type: 'task',
          urgency: 7,
          importance: 8,
          isPersonal: currentMode === 'personal'
        })
        
        await createChildNode(parentId, {
          title: 'Reserve Hotel (Child 2)',
          type: 'task',
          urgency: 6,
          importance: 7,
          isPersonal: currentMode === 'personal'
        })
        
        console.log('✅ Test relationships created!')
      }
    } catch (error) {
      console.error('Failed to create test relationships:', error)
    }
  }
  
  const handleNodeContextMenuClose = () => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, node: null })
  }
  
  const handleNodeContextMenu = (e: React.MouseEvent, node: any) => {
    e.preventDefault()
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      node: node
    })
  }
  
  const handleUpdateNode = async (nodeId: string, updates: any) => {
    await updateNode(nodeId, updates)
    handleNodeContextMenuClose()
  }
  
  const handleDeleteNode = async (nodeId: string) => {
    await deleteNode(nodeId)
    handleNodeContextMenuClose()
  }
  
  const handleSnoozeNode = async (nodeId: string, until: Date) => {
    await snoozeNode(nodeId, until)
    handleNodeContextMenuClose()
  }
  
  const handleUnsnoozeNode = async (nodeId: string) => {
    await unsnoozeNode(nodeId)
    handleNodeContextMenuClose()
  }
  
  return {
    handleDragEnd,
    handleAddTask,
    createTestRelationships,
    handleNodeContextMenu,
    handleNodeContextMenuClose,
    handleUpdateNode,
    handleDeleteNode,
    handleSnoozeNode,
    handleUnsnoozeNode,
  }
}