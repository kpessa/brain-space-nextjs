import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NodeCard } from '@/components/nodes/NodeCard'
import { useNodesStore } from '@/store/nodes'
import type { Node } from '@/types/node'

// Mock dependencies
jest.mock('@/store/nodes')
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const DynamicComponent = () => null
    DynamicComponent.displayName = 'DynamicComponent'
    return DynamicComponent
  }
}))

// Mock icons from lib/icons
jest.mock('@/lib/icons', () => ({
  MoreHorizontal: () => <div data-testid="icon-more">⋯</div>,
  CheckCircle: () => <div data-testid="icon-check-circle">✓</div>,
  Circle: () => <div data-testid="icon-circle">○</div>,
  GitBranch: () => <div data-testid="icon-branch">⑂</div>,
  GitMerge: () => <div data-testid="icon-merge">⑃</div>,
  CheckSquare: () => <div data-testid="icon-check-square">☑</div>,
  Square: () => <div data-testid="icon-square">☐</div>,
  Trash2: () => <div data-testid="icon-trash">🗑</div>,
  MessageSquare: () => <div data-testid="icon-message">💬</div>,
  Pin: () => <div data-testid="icon-pin">📌</div>,
  Repeat: () => <div data-testid="icon-repeat">🔁</div>,
  Edit: () => <div data-testid="icon-edit">✏️</div>,
  Calendar: () => <div data-testid="icon-calendar">📅</div>,
  CalendarPlus: () => <div data-testid="icon-calendar-plus">📅+</div>,
  Clock: () => <div data-testid="icon-clock">⏰</div>
}))

// Mock dayjs
jest.mock('@/lib/dayjs', () => ({
  __esModule: true,
  default: jest.fn((date) => ({
    format: jest.fn(() => '2024-01-01'),
    fromNow: jest.fn(() => 'a few seconds ago'),
    isAfter: jest.fn(() => false),
    isBefore: jest.fn(() => true)
  }))
}))

// Mock node type utilities
jest.mock('@/types/node', () => ({
  ...jest.requireActual('@/types/node'),
  getNodeTypeColor: jest.fn((type) => {
    const colors: Record<string, string> = {
      task: 'bg-blue-500',
      idea: 'bg-yellow-500',
      note: 'bg-gray-500',
      goal: 'bg-green-500'
    }
    return colors[type] || 'bg-gray-500'
  }),
  getNodeTypeIcon: jest.fn((type) => {
    const icons: Record<string, string> = {
      task: '✓',
      idea: '💡',
      note: '📝',
      goal: '🎯'
    }
    return icons[type] || '📝'
  }),
  getEisenhowerQuadrant: jest.fn(() => 'important-urgent')
}))

// Mock snooze utilities
jest.mock('@/lib/snooze', () => ({
  isSnoozed: jest.fn((node) => !!node.snoozedUntil),
  formatSnoozeUntil: jest.fn(() => 'Snoozed until tomorrow')
}))

describe('NodeCard', () => {
  const mockNode: Node = {
    id: 'node-1',
    userId: 'user-123',
    type: 'task',
    title: 'Test Task',
    description: 'This is a test task description',
    tags: ['urgent', 'work'],
    completed: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    isPersonal: false,
    urgency: 7,
    importance: 8
  }

  const mockUpdateNode = jest.fn()
  const mockDeleteNode = jest.fn()
  const mockGetNodeChildren = jest.fn(() => [])
  const mockGetNodeParent = jest.fn(() => null)
  const mockToggleNodePin = jest.fn()
  const mockSnoozeNode = jest.fn()
  const mockUnsnoozeNode = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useNodesStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        updateNode: mockUpdateNode,
        deleteNode: mockDeleteNode,
        getNodeChildren: mockGetNodeChildren,
        getNodeParent: mockGetNodeParent,
        toggleNodePin: mockToggleNodePin,
        snoozeNode: mockSnoozeNode,
        unsnoozeNode: mockUnsnoozeNode
      }
      return selector ? selector(state) : state
    })
  })

  describe('Rendering', () => {
    it('should render node with title and description', () => {
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
        />
      )
      
      expect(screen.getByText('Test Task')).toBeInTheDocument()
      expect(screen.getByText('This is a test task description')).toBeInTheDocument()
    })

    it('should render tags', () => {
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
        />
      )
      
      expect(screen.getByText('urgent')).toBeInTheDocument()
      expect(screen.getByText('work')).toBeInTheDocument()
    })

    it('should show completion checkbox', () => {
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
        />
      )
      
      const checkbox = screen.getByTestId('icon-circle')
      expect(checkbox).toBeInTheDocument()
    })

    it('should show checked icon when completed', () => {
      const completedNode = { ...mockNode, completed: true }
      render(
        <NodeCard 
          node={completedNode} 
          userId="user-123"
        />
      )
      
      const checkedIcon = screen.getByTestId('icon-check-circle')
      expect(checkedIcon).toBeInTheDocument()
    })

    it('should show pin icon for pinned nodes', () => {
      const pinnedNode = { ...mockNode, pinned: true }
      render(
        <NodeCard 
          node={pinnedNode} 
          userId="user-123"
        />
      )
      
      const pinIcon = screen.getByTestId('icon-pin')
      expect(pinIcon).toBeInTheDocument()
    })

    it('should show snooze indicator for snoozed nodes', () => {
      const snoozedNode = { 
        ...mockNode, 
        snoozedUntil: new Date('2024-12-31') 
      }
      render(
        <NodeCard 
          node={snoozedNode} 
          userId="user-123"
        />
      )
      
      const clockIcon = screen.getByTestId('icon-clock')
      expect(clockIcon).toBeInTheDocument()
    })

    it('should show update count if node has updates', () => {
      const nodeWithUpdates: Node = {
        ...mockNode,
        updates: [
          { id: '1', text: 'Update 1', timestamp: new Date(), userId: 'user-123' },
          { id: '2', text: 'Update 2', timestamp: new Date(), userId: 'user-123' }
        ]
      }
      
      render(
        <NodeCard 
          node={nodeWithUpdates} 
          userId="user-123"
        />
      )
      
      const messageIcon = screen.getByTestId('icon-message')
      expect(messageIcon).toBeInTheDocument()
      // Update count should be visible
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should toggle completion when checkbox clicked', async () => {
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
        />
      )
      
      const checkbox = screen.getByTestId('icon-circle')
      fireEvent.click(checkbox)
      
      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { completed: true })
      })
    })

    it('should toggle pin when pin button clicked', async () => {
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
        />
      )
      
      // First open dropdown menu
      const moreButton = screen.getByTestId('icon-more')
      fireEvent.click(moreButton)
      
      // Find and click pin option
      const pinButton = screen.getByText(/pin/i)
      fireEvent.click(pinButton)
      
      await waitFor(() => {
        expect(mockToggleNodePin).toHaveBeenCalledWith('node-1')
      })
    })

    it('should show dropdown menu when more button clicked', () => {
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
        />
      )
      
      const moreButton = screen.getByTestId('icon-more')
      fireEvent.click(moreButton)
      
      // Dropdown menu items should be visible
      expect(screen.getByText(/delete/i)).toBeInTheDocument()
      expect(screen.getByText(/pin/i)).toBeInTheDocument()
    })

    it('should close dropdown when clicking outside', async () => {
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
        />
      )
      
      // Open dropdown
      const moreButton = screen.getByTestId('icon-more')
      fireEvent.click(moreButton)
      
      expect(screen.getByText(/delete/i)).toBeInTheDocument()
      
      // Click outside
      fireEvent.mouseDown(document.body)
      
      await waitFor(() => {
        expect(screen.queryByText(/delete/i)).not.toBeInTheDocument()
      })
    })

    it('should handle node click', () => {
      const onNodeClick = jest.fn()
      
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
          onNodeClick={onNodeClick}
        />
      )
      
      const card = screen.getByText('Test Task').closest('div')
      fireEvent.click(card!)
      
      expect(onNodeClick).toHaveBeenCalledWith(mockNode)
    })

    it('should handle create child action', () => {
      const onCreateChild = jest.fn()
      
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
          onCreateChild={onCreateChild}
        />
      )
      
      // Open dropdown
      const moreButton = screen.getByTestId('icon-more')
      fireEvent.click(moreButton)
      
      // Click create child option
      const createChildButton = screen.getByText(/create child/i)
      fireEvent.click(createChildButton)
      
      expect(onCreateChild).toHaveBeenCalledWith(mockNode)
    })

    it('should handle create parent action', () => {
      const onCreateParent = jest.fn()
      
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
          onCreateParent={onCreateParent}
        />
      )
      
      // Open dropdown
      const moreButton = screen.getByTestId('icon-more')
      fireEvent.click(moreButton)
      
      // Click create parent option
      const createParentButton = screen.getByText(/create parent/i)
      fireEvent.click(createParentButton)
      
      expect(onCreateParent).toHaveBeenCalledWith(mockNode)
    })
  })

  describe('Selection Mode', () => {
    it('should show selection checkbox in select mode', () => {
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
          selectMode={true}
        />
      )
      
      // Should have selection checkbox
      const checkbox = screen.getByTestId('icon-square')
      expect(checkbox).toBeInTheDocument()
    })

    it('should handle selection toggle', () => {
      const onSelect = jest.fn()
      
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
          selectMode={true}
          onSelect={onSelect}
          isSelected={false}
        />
      )
      
      const checkbox = screen.getByTestId('icon-square')
      fireEvent.click(checkbox)
      
      expect(onSelect).toHaveBeenCalledWith('node-1', true)
    })

    it('should show selected state', () => {
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
          selectMode={true}
          isSelected={true}
        />
      )
      
      // Should show checked square icon
      const checkedIcon = screen.getByTestId('icon-check-square')
      expect(checkedIcon).toBeInTheDocument()
    })
  })

  describe('Node Relationships', () => {
    it('should display parent relationship', () => {
      const parentNode = { ...mockNode, id: 'parent-1', title: 'Parent Task' }
      mockGetNodeParent.mockReturnValue(parentNode)
      
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
        />
      )
      
      // Should show parent indicator
      const branchIcon = screen.getByTestId('icon-branch')
      expect(branchIcon).toBeInTheDocument()
    })

    it('should display child count', () => {
      const childNodes = [
        { ...mockNode, id: 'child-1' },
        { ...mockNode, id: 'child-2' }
      ]
      mockGetNodeChildren.mockReturnValue(childNodes)
      
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
        />
      )
      
      // Should show child count
      expect(screen.getByText(/2 children/i)).toBeInTheDocument()
    })
  })

  describe('Snooze Functionality', () => {
    it('should show snooze option in dropdown', () => {
      render(
        <NodeCard 
          node={mockNode} 
          userId="user-123"
        />
      )
      
      // Open dropdown
      const moreButton = screen.getByTestId('icon-more')
      fireEvent.click(moreButton)
      
      expect(screen.getByText(/snooze/i)).toBeInTheDocument()
    })

    it('should unsnooze a snoozed node', async () => {
      const snoozedNode = { 
        ...mockNode, 
        snoozedUntil: new Date('2024-12-31') 
      }
      
      render(
        <NodeCard 
          node={snoozedNode} 
          userId="user-123"
        />
      )
      
      // Open dropdown
      const moreButton = screen.getByTestId('icon-more')
      fireEvent.click(moreButton)
      
      // Click unsnooze
      const unsnoozeButton = screen.getByText(/unsnooze/i)
      fireEvent.click(unsnoozeButton)
      
      await waitFor(() => {
        expect(mockUnsnoozeNode).toHaveBeenCalledWith('node-1')
      })
    })
  })
})