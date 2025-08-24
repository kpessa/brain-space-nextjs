import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TimeboxNodePool } from '@/components/timebox/TimeboxNodePool'
import type { Node, NodeType } from '@/types/node'
import type { TimeboxTask } from '@/store/timeboxStore'

// Mock dependencies
jest.mock('@/lib/icons', () => ({
  Target: () => <div data-testid="icon-target">🎯</div>,
  Filter: () => <div data-testid="icon-filter">🔽</div>,
  Eye: () => <div data-testid="icon-eye">👁</div>,
  Search: () => <div data-testid="icon-search">🔍</div>
}))

jest.mock('@/types/node', () => ({
  ...jest.requireActual('@/types/node'),
  getNodeTypeIcon: jest.fn((type) => {
    const icons: Record<string, string> = {
      task: '✓',
      idea: '💡',
      note: '📝',
      goal: '🎯'
    }
    return icons[type] || '📝'
  })
}))

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}))

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, variant, size, className, title, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={`${variant} ${size} ${className}`}
      title={title}
      {...props}
    >
      {children}
    </button>
  )
}))

describe('TimeboxNodePool', () => {
  const mockNodes: Node[] = [
    {
      id: 'node-1',
      userId: 'user-123',
      type: 'task',
      title: 'Complete project report',
      description: 'Finish Q4 report',
      tags: ['work', 'urgent'],
      completed: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      isPersonal: false,
      urgency: 8,
      importance: 9
    },
    {
      id: 'node-2',
      userId: 'user-123',
      type: 'idea',
      title: 'New app feature',
      description: 'Add dark mode',
      tags: ['development'],
      completed: false,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      isPersonal: true,
      urgency: 3,
      importance: 5
    },
    {
      id: 'node-3',
      userId: 'user-123',
      type: 'note',
      title: 'Meeting notes',
      description: 'Team sync notes',
      tags: ['meeting'],
      completed: false,
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
      isPersonal: false,
      urgency: 2,
      importance: 4
    }
  ]

  const defaultProps = {
    unscheduledNodes: mockNodes,
    nodeFilterMode: 'all' as const,
    selectedNodeType: 'all' as const,
    searchQuery: '',
    availableNodeTypes: ['task', 'idea', 'note', 'goal'] as NodeType[],
    currentMode: 'all',
    onSetNodeFilterMode: jest.fn(),
    onSetSelectedNodeType: jest.fn(),
    onSetSearchQuery: jest.fn(),
    onClearFilters: jest.fn(),
    onHandleDragStart: jest.fn(),
    onHandleDragEnd: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the component with title and description', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      expect(screen.getByText('Node Pool')).toBeInTheDocument()
      expect(screen.getByText('Drag nodes into time blocks')).toBeInTheDocument()
      expect(screen.getByTestId('icon-target')).toBeInTheDocument()
    })

    it('should display the count of unscheduled nodes', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should render all unscheduled nodes', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      expect(screen.getByText('Complete project report')).toBeInTheDocument()
      expect(screen.getByText('New app feature')).toBeInTheDocument()
      expect(screen.getByText('Meeting notes')).toBeInTheDocument()
    })

    it('should display node details correctly', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      // Check urgency and importance display
      expect(screen.getByText('U:8 I:9')).toBeInTheDocument()
      expect(screen.getByText('U:3 I:5')).toBeInTheDocument()
      expect(screen.getByText('U:2 I:4')).toBeInTheDocument()
    })

    it('should display work/personal indicators', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      // Work nodes should show 'W'
      const workIndicators = screen.getAllByText('W')
      expect(workIndicators).toHaveLength(2)
      
      // Personal nodes should show 'P'
      const personalIndicators = screen.getAllByText('P')
      expect(personalIndicators).toHaveLength(1)
    })

    it('should display node type icons and labels', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      expect(screen.getByText('task')).toBeInTheDocument()
      expect(screen.getByText('idea')).toBeInTheDocument()
      expect(screen.getByText('note')).toBeInTheDocument()
    })

    it('should render empty state when no nodes', () => {
      render(<TimeboxNodePool {...defaultProps} unscheduledNodes={[]} />)
      
      expect(screen.getByText('No unscheduled nodes')).toBeInTheDocument()
      expect(screen.getByText('Create nodes from the Nodes page')).toBeInTheDocument()
    })

    it('should render filtered empty state with clear button', () => {
      render(
        <TimeboxNodePool 
          {...defaultProps} 
          unscheduledNodes={[]} 
          searchQuery="test"
        />
      )
      
      expect(screen.getByText('No nodes match filters')).toBeInTheDocument()
      const clearButton = screen.getByText('Clear Filters')
      expect(clearButton).toBeInTheDocument()
    })
  })

  describe('Filter Controls', () => {
    it('should render filter mode toggle buttons', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      expect(screen.getByTestId('icon-filter')).toBeInTheDocument()
      expect(screen.getByTestId('icon-eye')).toBeInTheDocument()
    })

    it('should call onSetNodeFilterMode when filter buttons clicked', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      const filterButton = screen.getByTestId('icon-filter').parentElement as HTMLElement
      fireEvent.click(filterButton)
      expect(defaultProps.onSetNodeFilterMode).toHaveBeenCalledWith('filtered')
      
      const allButton = screen.getByTestId('icon-eye').parentElement as HTMLElement
      fireEvent.click(allButton)
      expect(defaultProps.onSetNodeFilterMode).toHaveBeenCalledWith('all')
    })

    it('should highlight active filter mode', () => {
      const { rerender } = render(
        <TimeboxNodePool {...defaultProps} nodeFilterMode="filtered" />
      )
      
      const filterButton = screen.getByTestId('icon-filter').parentElement as HTMLElement
      expect(filterButton.className).toContain('primary')
      
      rerender(<TimeboxNodePool {...defaultProps} nodeFilterMode="all" />)
      
      const allButton = screen.getByTestId('icon-eye').parentElement as HTMLElement
      expect(allButton.className).toContain('primary')
    })

    it('should render type filter dropdown', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      const typeSelect = screen.getByRole('combobox')
      expect(typeSelect).toBeInTheDocument()
      expect(typeSelect).toHaveValue('all')
      
      // Check options
      const options = within(typeSelect).getAllByRole('option')
      expect(options).toHaveLength(5) // all + 4 types
      expect(options[0]).toHaveTextContent('All Types')
      expect(options[1]).toHaveTextContent('Task')
    })

    it('should call onSetSelectedNodeType when type filter changes', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      const typeSelect = screen.getByRole('combobox')
      fireEvent.change(typeSelect, { target: { value: 'task' } })
      
      expect(defaultProps.onSetSelectedNodeType).toHaveBeenCalledWith('task')
    })

    it('should render search input', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search...')
      expect(searchInput).toBeInTheDocument()
      expect(screen.getByTestId('icon-search')).toBeInTheDocument()
    })

    it('should call onSetSearchQuery when search input changes', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search...')
      fireEvent.change(searchInput, { target: { value: 'project' } })
      
      expect(defaultProps.onSetSearchQuery).toHaveBeenCalledWith('project')
    })

    it('should display current search query', () => {
      render(<TimeboxNodePool {...defaultProps} searchQuery="report" />)
      
      const searchInput = screen.getByPlaceholderText('Search...') as HTMLInputElement
      expect(searchInput.value).toBe('report')
    })

    it('should call onClearFilters when clear button clicked', () => {
      render(
        <TimeboxNodePool 
          {...defaultProps} 
          unscheduledNodes={[]} 
          searchQuery="test"
        />
      )
      
      const clearButton = screen.getByText('Clear Filters')
      fireEvent.click(clearButton)
      
      expect(defaultProps.onClearFilters).toHaveBeenCalled()
    })
  })

  describe('Drag and Drop', () => {
    it('should make nodes draggable', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      const firstNode = screen.getByText('Complete project report').closest('div[draggable]')
      expect(firstNode).toHaveAttribute('draggable', 'true')
    })

    it('should call onHandleDragStart when dragging starts', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      const firstNode = screen.getByText('Complete project report').closest('div[draggable]') as HTMLElement
      const dragEvent = new Event('dragstart', { bubbles: true })
      fireEvent(firstNode, dragEvent)
      
      expect(defaultProps.onHandleDragStart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          label: 'Complete project report',
          nodeId: 'node-1',
          importance: 9,
          urgency: 8,
          category: 'task',
          isPersonal: false
        })
      )
    })

    it('should generate unique task ID on drag', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      const firstNode = screen.getByText('Complete project report').closest('div[draggable]') as HTMLElement
      const dragEvent = new Event('dragstart', { bubbles: true })
      fireEvent(firstNode, dragEvent)
      
      const callArgs = defaultProps.onHandleDragStart.mock.calls[0][1]
      expect(callArgs.id).toMatch(/^task-node-1-\d+$/)
    })

    it('should call onHandleDragEnd when dragging ends', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      const firstNode = screen.getByText('Complete project report').closest('div[draggable]') as HTMLElement
      fireEvent.dragEnd(firstNode)
      
      expect(defaultProps.onHandleDragEnd).toHaveBeenCalled()
    })

    it('should handle nodes without title', () => {
      const nodeWithoutTitle: Node = {
        ...mockNodes[0],
        title: undefined
      }
      
      render(
        <TimeboxNodePool 
          {...defaultProps} 
          unscheduledNodes={[nodeWithoutTitle]}
        />
      )
      
      expect(screen.getByText('Untitled')).toBeInTheDocument()
    })

    it('should create task with untitled label for nodes without title', () => {
      const nodeWithoutTitle: Node = {
        ...mockNodes[0],
        title: undefined
      }
      
      render(
        <TimeboxNodePool 
          {...defaultProps} 
          unscheduledNodes={[nodeWithoutTitle]}
        />
      )
      
      const untitledNode = screen.getByText('Untitled').closest('div[draggable]') as HTMLElement
      const dragEvent = new Event('dragstart', { bubbles: true })
      fireEvent(untitledNode, dragEvent)
      
      expect(defaultProps.onHandleDragStart).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          label: 'Untitled'
        })
      )
    })
  })

  describe('Visual States', () => {
    it('should apply hover styles to draggable nodes', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      const firstNode = screen.getByText('Complete project report').closest('div[draggable]')
      expect(firstNode).toHaveClass('hover:shadow-sm')
    })

    it('should show cursor-move for draggable nodes', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      const firstNode = screen.getByText('Complete project report').closest('div[draggable]')
      expect(firstNode).toHaveClass('cursor-move')
    })

    it('should apply correct button variants based on filter mode', () => {
      const { rerender } = render(
        <TimeboxNodePool {...defaultProps} nodeFilterMode="filtered" />
      )
      
      let filterButton = screen.getByTestId('icon-filter').parentElement as HTMLElement
      let allButton = screen.getByTestId('icon-eye').parentElement as HTMLElement
      
      expect(filterButton.className).toContain('primary')
      expect(allButton.className).toContain('outline')
      
      rerender(<TimeboxNodePool {...defaultProps} nodeFilterMode="all" />)
      
      filterButton = screen.getByTestId('icon-filter').parentElement as HTMLElement
      allButton = screen.getByTestId('icon-eye').parentElement as HTMLElement
      
      expect(filterButton.className).toContain('outline')
      expect(allButton.className).toContain('primary')
    })
  })

  describe('Accessibility', () => {
    it('should have proper button titles for screen readers', () => {
      render(<TimeboxNodePool {...defaultProps} currentMode="work" />)
      
      const filterButton = screen.getByTestId('icon-filter').parentElement as HTMLElement
      expect(filterButton).toHaveAttribute('title', 'Show work nodes only')
      
      const allButton = screen.getByTestId('icon-eye').parentElement as HTMLElement
      expect(allButton).toHaveAttribute('title', 'Show all nodes')
    })

    it('should have proper labels for form controls', () => {
      render(<TimeboxNodePool {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search...')
      expect(searchInput).toHaveAttribute('type', 'text')
      
      const typeSelect = screen.getByRole('combobox')
      expect(typeSelect).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle nodes with undefined urgency/importance', () => {
      const nodeWithoutScores: Node = {
        ...mockNodes[0],
        urgency: undefined,
        importance: undefined
      }
      
      render(
        <TimeboxNodePool 
          {...defaultProps} 
          unscheduledNodes={[nodeWithoutScores]}
        />
      )
      
      // Should not display U: I: text when undefined
      expect(screen.queryByText(/U:\d+ I:\d+/)).not.toBeInTheDocument()
    })

    it('should handle nodes with undefined isPersonal', () => {
      const nodeWithoutPersonal: Node = {
        ...mockNodes[0],
        isPersonal: undefined
      }
      
      render(
        <TimeboxNodePool 
          {...defaultProps} 
          unscheduledNodes={[nodeWithoutPersonal]}
        />
      )
      
      // Should not display W or P indicator when undefined
      const node = screen.getByText('Complete project report').parentElement?.parentElement
      expect(node).not.toHaveTextContent('W')
      expect(node).not.toHaveTextContent('P')
    })

    it('should handle empty availableNodeTypes', () => {
      render(
        <TimeboxNodePool 
          {...defaultProps} 
          availableNodeTypes={[]}
        />
      )
      
      const typeSelect = screen.getByRole('combobox')
      const options = within(typeSelect).getAllByRole('option')
      expect(options).toHaveLength(1) // Only "All Types"
    })
  })
})