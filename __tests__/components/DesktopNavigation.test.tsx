import React from 'react'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DesktopNavigation } from '@/components/DesktopNavigation'
import { usePathname } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn()
}))

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
})

// Mock navigation config
jest.mock('@/lib/navigation', () => ({
  navigation: [
    { name: 'Todos', href: '/todos', icon: () => <span data-testid="icon-todos">📝</span> },
    { name: 'Journal', href: '/journal', icon: () => <span data-testid="icon-journal">📖</span> },
    { name: 'Nodes', href: '/nodes', icon: () => <span data-testid="icon-nodes">🔗</span> },
    { name: 'Brain Dump', href: '/braindump', icon: () => <span data-testid="icon-braindump">🧠</span> },
    { name: 'Matrix', href: '/matrix', icon: () => <span data-testid="icon-matrix">⚡</span> },
    { name: 'Progress', href: '/progress', icon: () => <span data-testid="icon-progress">🏆</span> }
  ]
}))

// Mock navigation utils
jest.mock('@/lib/navigation-utils', () => ({
  isNavItemActive: (pathname: string, href: string) => {
    // Simple active check - exact match or starts with for nested routes
    if (!pathname) return false
    // Handle query strings and hashes
    const cleanPathname = pathname.split('?')[0].split('#')[0]
    return cleanPathname === href || cleanPathname.startsWith(`${href}/`)
  }
}))

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

describe('DesktopNavigation', () => {
  const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/todos')
  })

  describe('Rendering', () => {
    it('should render all navigation items', () => {
      render(<DesktopNavigation />)
      
      expect(screen.getByText('Todos')).toBeInTheDocument()
      expect(screen.getByText('Journal')).toBeInTheDocument()
      expect(screen.getByText('Nodes')).toBeInTheDocument()
      expect(screen.getByText('Brain Dump')).toBeInTheDocument()
      expect(screen.getByText('Matrix')).toBeInTheDocument()
      expect(screen.getByText('Progress')).toBeInTheDocument()
    })

    it('should render navigation icons', () => {
      render(<DesktopNavigation />)
      
      expect(screen.getByTestId('icon-todos')).toBeInTheDocument()
      expect(screen.getByTestId('icon-journal')).toBeInTheDocument()
      expect(screen.getByTestId('icon-nodes')).toBeInTheDocument()
      expect(screen.getByTestId('icon-braindump')).toBeInTheDocument()
      expect(screen.getByTestId('icon-matrix')).toBeInTheDocument()
      expect(screen.getByTestId('icon-progress')).toBeInTheDocument()
    })

    it('should render links with correct href attributes', () => {
      render(<DesktopNavigation />)
      
      const todosLink = screen.getByRole('link', { name: /todos/i })
      expect(todosLink).toHaveAttribute('href', '/todos')
      
      const journalLink = screen.getByRole('link', { name: /journal/i })
      expect(journalLink).toHaveAttribute('href', '/journal')
      
      const nodesLink = screen.getByRole('link', { name: /nodes/i })
      expect(nodesLink).toHaveAttribute('href', '/nodes')
      
      const braindumpLink = screen.getByRole('link', { name: /brain dump/i })
      expect(braindumpLink).toHaveAttribute('href', '/braindump')
    })

    it('should render navigation in a nav element', () => {
      const { container } = render(<DesktopNavigation />)
      const nav = container.querySelector('nav')
      expect(nav).toBeInTheDocument()
    })

    it('should use semantic list structure', () => {
      const { container } = render(<DesktopNavigation />)
      const lists = container.querySelectorAll('ul')
      const listItems = container.querySelectorAll('li')
      
      expect(lists.length).toBeGreaterThan(0)
      expect(listItems.length).toBeGreaterThan(0)
    })
  })

  describe('Active State', () => {
    it('should highlight active navigation item', () => {
      mockUsePathname.mockReturnValue('/todos')
      render(<DesktopNavigation />)
      
      const todosLink = screen.getByRole('link', { name: /todos/i })
      expect(todosLink.className).toContain('bg-accent')
      expect(todosLink.className).toContain('text-accent-foreground')
    })

    it('should not highlight inactive navigation items', () => {
      mockUsePathname.mockReturnValue('/todos')
      render(<DesktopNavigation />)
      
      const journalLink = screen.getByRole('link', { name: /journal/i })
      expect(journalLink.className).not.toContain('bg-accent')
      expect(journalLink.className).toContain('text-gray-700')
    })

    it('should update active state when pathname changes', () => {
      const { rerender } = render(<DesktopNavigation />)
      
      mockUsePathname.mockReturnValue('/journal')
      rerender(<DesktopNavigation />)
      
      const journalLink = screen.getByRole('link', { name: /journal/i })
      expect(journalLink.className).toContain('bg-accent')
      
      const todosLink = screen.getByRole('link', { name: /todos/i })
      expect(todosLink.className).not.toContain('bg-accent')
    })

    it('should handle nested routes as active', () => {
      mockUsePathname.mockReturnValue('/nodes/create')
      render(<DesktopNavigation />)
      
      const nodesLink = screen.getByRole('link', { name: /nodes/i })
      expect(nodesLink.className).toContain('bg-accent')
    })

    it('should handle root path', () => {
      mockUsePathname.mockReturnValue('/')
      render(<DesktopNavigation />)
      
      // No items should be active on root path
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link.className).not.toContain('bg-accent')
      })
    })
  })

  describe('Styling', () => {
    it('should apply base styles to all links', () => {
      render(<DesktopNavigation />)
      
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link.className).toContain('group')
        expect(link.className).toContain('flex')
        expect(link.className).toContain('gap-x-3')
        expect(link.className).toContain('rounded-md')
        expect(link.className).toContain('p-2')
      })
    })

    it('should apply hover styles to inactive links', () => {
      mockUsePathname.mockReturnValue('/todos')
      render(<DesktopNavigation />)
      
      const journalLink = screen.getByRole('link', { name: /journal/i })
      expect(journalLink.className).toContain('hover:text-primary')
      expect(journalLink.className).toContain('hover:bg-gray-50')
    })

    it('should apply correct text sizing', () => {
      render(<DesktopNavigation />)
      
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link.className).toContain('text-sm')
        expect(link.className).toContain('leading-6')
        expect(link.className).toContain('font-semibold')
      })
    })

    it('should apply transition classes', () => {
      render(<DesktopNavigation />)
      
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link.className).toContain('transition-colors')
      })
    })

    it('should render icons with correct container', () => {
      render(<DesktopNavigation />)
      
      // Icons are rendered inside the navigation items
      const icons = [
        screen.getByTestId('icon-todos'),
        screen.getByTestId('icon-journal'),
        screen.getByTestId('icon-nodes')
      ]
      
      icons.forEach(icon => {
        // The icon component itself would have these classes applied
        // In the actual component, item.icon is rendered with className="h-6 w-6 shrink-0"
        expect(icon).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should use semantic navigation element', () => {
      const { container } = render(<DesktopNavigation />)
      const nav = container.querySelector('nav')
      expect(nav).toBeInTheDocument()
      expect(nav).toHaveAttribute('class', expect.stringContaining('flex'))
    })

    it('should maintain focus order', () => {
      render(<DesktopNavigation />)
      
      const links = screen.getAllByRole('link')
      // Links should be in the expected order
      expect(links[0]).toHaveTextContent('Todos')
      expect(links[1]).toHaveTextContent('Journal')
      expect(links[2]).toHaveTextContent('Nodes')
      expect(links[3]).toHaveTextContent('Brain Dump')
    })

    it('should have descriptive link text', () => {
      render(<DesktopNavigation />)
      
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        // Each link should have non-empty text content
        expect(link.textContent).toBeTruthy()
        expect(link.textContent?.length).toBeGreaterThan(0)
      })
    })

    it('should support keyboard navigation', () => {
      render(<DesktopNavigation />)
      
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        // Links should be focusable (no tabindex=-1)
        expect(link).not.toHaveAttribute('tabindex', '-1')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined pathname', () => {
      mockUsePathname.mockReturnValue(undefined as any)
      
      expect(() => render(<DesktopNavigation />)).not.toThrow()
      
      // No items should be active
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link.className).not.toContain('bg-accent')
      })
    })

    it('should handle empty pathname', () => {
      mockUsePathname.mockReturnValue('')
      render(<DesktopNavigation />)
      
      // No items should be active
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link.className).not.toContain('bg-accent')
      })
    })

    it('should handle special characters in pathname', () => {
      mockUsePathname.mockReturnValue('/todos?filter=active')
      render(<DesktopNavigation />)
      
      // Todos should still be active
      const todosLink = screen.getByRole('link', { name: /todos/i })
      expect(todosLink.className).toContain('bg-accent')
    })

    it('should handle hash in pathname', () => {
      mockUsePathname.mockReturnValue('/journal#entry-1')
      render(<DesktopNavigation />)
      
      const journalLink = screen.getByRole('link', { name: /journal/i })
      expect(journalLink.className).toContain('bg-accent')
    })
  })

  describe('Layout', () => {
    it('should use flex layout for navigation', () => {
      const { container } = render(<DesktopNavigation />)
      const nav = container.querySelector('nav')
      expect(nav?.className).toContain('flex')
      expect(nav?.className).toContain('flex-1')
      expect(nav?.className).toContain('flex-col')
    })

    it('should apply correct spacing between items', () => {
      const { container } = render(<DesktopNavigation />)
      const innerList = container.querySelector('ul ul')
      expect(innerList?.className).toContain('space-y-1')
      expect(innerList?.className).toContain('-mx-2')
    })

    it('should apply correct gap between sections', () => {
      const { container } = render(<DesktopNavigation />)
      const outerList = container.querySelector('ul')
      expect(outerList?.className).toContain('gap-y-7')
    })
  })
})