'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { MatrixNodeCard } from '@/components/matrix/MatrixNodeCard'
import { QuadrantCard } from '@/components/matrix/QuadrantCard'
import { getFamilyColor, hasChildren } from '@/components/matrix/utils'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Star, Clock, Calendar, Eye, EyeOff } from 'lucide-react'

// Dynamic import for drag and drop
const DragDropContext = dynamic(() => import('@hello-pangea/dnd').then(mod => ({ default: mod.DragDropContext })), { ssr: false })
import type { DropResult } from '@hello-pangea/dnd'

// Sample data with parent-child relationships
const DEMO_NODES = [
  // Standalone task
  {
    id: 'task-1',
    title: 'Review quarterly report',
    description: 'Review and provide feedback on Q4 report',
    urgency: 8,
    importance: 9,
    type: 'task',
    tags: ['review', 'quarterly'],
  },
  
  // Parent project with children
  {
    id: 'project-1',
    title: '🎯 Website Redesign',
    description: 'Complete redesign of company website',
    urgency: 9,
    importance: 9,
    type: 'project',
    tags: ['design', 'web'],
    children: ['task-2', 'task-3', 'task-4'],
  },
  {
    id: 'task-2',
    title: 'Create mockups',
    description: 'Design new homepage and landing pages',
    urgency: 9,
    importance: 8,
    type: 'task',
    parent: 'project-1',
    tags: ['design'],
  },
  {
    id: 'task-3',
    title: 'Implement frontend',
    description: 'Build React components for new design',
    urgency: 8,
    importance: 9,
    type: 'task',
    parent: 'project-1',
    tags: ['development'],
  },
  {
    id: 'task-4',
    title: 'User testing',
    description: 'Conduct usability testing with 5 users',
    urgency: 7,
    importance: 8,
    type: 'task',
    parent: 'project-1',
    tags: ['testing'],
  },
  
  // Another parent with children in Schedule quadrant
  {
    id: 'goal-1',
    title: '📚 Learn TypeScript',
    description: 'Master TypeScript for better code quality',
    urgency: 4,
    importance: 8,
    type: 'goal',
    children: ['task-5', 'task-6'],
  },
  {
    id: 'task-5',
    title: 'Complete online course',
    description: 'Finish TypeScript fundamentals course',
    urgency: 4,
    importance: 8,
    type: 'task',
    parent: 'goal-1',
  },
  {
    id: 'task-6',
    title: 'Build practice project',
    description: 'Create a small app using TypeScript',
    urgency: 3,
    importance: 7,
    type: 'task',
    parent: 'goal-1',
  },
  
  // Orphaned children (parent not in matrix)
  {
    id: 'task-7',
    title: 'Update documentation',
    description: 'Part of Documentation Overhaul project',
    urgency: 8,
    importance: 5,
    type: 'task',
    parent: 'project-99', // Parent doesn't exist in this view
  },
  {
    id: 'task-8',
    title: 'Fix typos in README',
    description: 'Part of Documentation Overhaul project',
    urgency: 8,
    importance: 4,
    type: 'task',
    parent: 'project-99', // Parent doesn't exist in this view
  },
  
  // Tasks for other quadrants
  {
    id: 'task-9',
    title: 'Reply to emails',
    urgency: 3,
    importance: 3,
    type: 'task',
  },
  {
    id: 'task-10',
    title: 'Organize desk',
    urgency: 2,
    importance: 2,
    type: 'task',
  },
]

const quadrants = [
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

export default function MatrixDemoClient() {
  const [nodes] = useState(DEMO_NODES)
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set(['project-1', 'goal-1']))
  const [showRelationships, setShowRelationships] = useState(true)
  const [isCollapsedView, setIsCollapsedView] = useState(false)
  
  // Organize nodes into quadrants
  const organizeNodes = () => {
    const organized: Record<string, any[]> = {
      'urgent-important': [],
      'not-urgent-important': [],
      'urgent-not-important': [],
      'not-urgent-not-important': [],
    }
    
    nodes.forEach(node => {
      const urgency = node.urgency || 5
      const importance = node.importance || 5
      
      if (urgency >= 7 && importance >= 7) {
        organized['urgent-important'].push(node)
      } else if (urgency < 7 && importance >= 7) {
        organized['not-urgent-important'].push(node)
      } else if (urgency >= 7 && importance < 7) {
        organized['urgent-not-important'].push(node)
      } else {
        organized['not-urgent-not-important'].push(node)
      }
    })
    
    return organized
  }
  
  const quadrantNodes = organizeNodes()
  
  const toggleFamily = (familyId: string) => {
    setExpandedFamilies(prev => {
      const next = new Set(prev)
      if (next.has(familyId)) {
        next.delete(familyId)
      } else {
        next.add(familyId)
      }
      return next
    })
  }
  
  const handleDragEnd = (result: DropResult) => {
    // Demo doesn't actually move items
    console.log('Drag ended:', result)
  }
  
  const renderQuadrantNodes = (quadrantId: string, nodes: any[]) => {
    if (!showRelationships) {
      // Simple rendering without relationships
      return nodes.map((node, index) => (
        <MatrixNodeCard
          key={node.id}
          node={node}
          index={index}
          isCollapsed={isCollapsedView}
        />
      ))
    }
    
    // Group nodes by families
    const families = new Map<string, any[]>()
    const standalone: any[] = []
    const orphans: any[] = []
    
    // Find parent nodes
    nodes.forEach(node => {
      if (hasChildren(node.id, nodes)) {
        const children = nodes.filter(n => n.parent === node.id)
        families.set(node.id, [node, ...children])
      }
    })
    
    // Find standalone and orphaned nodes
    nodes.forEach(node => {
      const isInFamily = Array.from(families.values()).some(family => 
        family.some(n => n.id === node.id)
      )
      
      if (!isInFamily) {
        if (node.parent && !nodes.find(n => n.id === node.parent)) {
          orphans.push(node)
        } else if (!node.parent) {
          standalone.push(node)
        }
      }
    })
    
    // Render all groups
    const elements: JSX.Element[] = []
    let currentIndex = 0
    
    // Render families
    families.forEach((familyNodes, parentId) => {
      const isExpanded = expandedFamilies.has(parentId)
      const familyColor = getFamilyColor(parentId)
      const parent = familyNodes[0]
      const children = familyNodes.slice(1)
      
      // Always show parent
      elements.push(
        <MatrixNodeCard
          key={parent.id}
          node={parent}
          index={currentIndex++}
          isCollapsed={isCollapsedView}
          isParent={true}
          familyColor={familyColor}
          allNodes={nodes}
          isExpanded={isExpanded}
          onToggleExpand={() => toggleFamily(parentId)}
          childCount={children.length}
        />
      )
      
      // Show children if expanded
      if (isExpanded) {
        children.forEach(child => {
          elements.push(
            <MatrixNodeCard
              key={child.id}
              node={child}
              index={currentIndex++}
              isCollapsed={isCollapsedView}
              isChild={true}
              familyColor={familyColor}
              indentLevel={1}
              allNodes={nodes}
              parentNode={parent}
            />
          )
        })
      }
      
      // Add spacing between families
      elements.push(<div key={`spacer-${parentId}`} className="h-2" />)
    })
    
    // Render orphans as a group
    if (orphans.length > 0) {
      const orphanColor = getFamilyColor('orphan-group')
      elements.push(
        <div key="orphan-label" className="text-xs text-gray-500 italic mb-1">
          Orphaned tasks (parent not visible):
        </div>
      )
      orphans.forEach(node => {
        elements.push(
          <MatrixNodeCard
            key={node.id}
            node={node}
            index={currentIndex++}
            isCollapsed={isCollapsedView}
            isChild={true}
            familyColor={orphanColor}
            indentLevel={1}
            allNodes={nodes}
          />
        )
      })
      elements.push(<div key="spacer-orphans" className="h-2" />)
    }
    
    // Render standalone nodes
    standalone.forEach(node => {
      elements.push(
        <MatrixNodeCard
          key={node.id}
          node={node}
          index={currentIndex++}
          isCollapsed={isCollapsedView}
          allNodes={nodes}
        />
      )
    })
    
    return elements
  }
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 min-h-[calc(100vh-4rem)]">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <div className="text-center mb-4">
              <h1 className="text-4xl font-bold text-white mb-2">Matrix Demo - Relationship Visualization</h1>
              <p className="text-white/80 text-lg">
                Demonstrating parent-child relationships in the Eisenhower Matrix
              </p>
            </div>
            
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRelationships(!showRelationships)}
                className="flex items-center gap-2"
              >
                {showRelationships ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {showRelationships ? 'Hide' : 'Show'} Relationships
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCollapsedView(!isCollapsedView)}
                className="flex items-center gap-2"
              >
                {isCollapsedView ? 'Expand' : 'Compact'} View
              </Button>
            </div>
            
            <div className="mt-4 bg-white/10 backdrop-blur rounded-lg p-4 text-white text-sm">
              <h3 className="font-semibold mb-2">Legend:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-500"></div>
                  <span>Parent nodes (4px border)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-6 bg-blue-500 ml-4"></div>
                  <span>Child nodes (2px border + indent)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📁/📂</span>
                  <span>Collapsed/Expanded parent</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>↳</span>
                  <span>Child indicator</span>
                </div>
              </div>
              <div className="mt-2 text-xs opacity-80">
                <p>• Families share the same color theme</p>
                <p>• Click chevron icons to expand/collapse families</p>
                <p>• Orphaned children (parent not visible) are grouped together</p>
              </div>
            </div>
          </header>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quadrants.map((quadrant) => {
              const nodesInQuadrant = quadrantNodes[quadrant.id]
              
              return (
                <QuadrantCard
                  key={quadrant.id}
                  quadrant={quadrant}
                  totalNodes={nodesInQuadrant.length}
                  visibleCount={nodesInQuadrant.length}
                  remainingCount={0}
                  onAddClick={() => console.log('Add clicked')}
                  onLoadMore={() => console.log('Load more')}
                >
                  {renderQuadrantNodes(quadrant.id, nodesInQuadrant)}
                </QuadrantCard>
              )
            })}
          </div>
          
          <div className="mt-8 bg-white rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Demo Data Structure</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Do First Quadrant:</h4>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Website Redesign</strong> (parent)</li>
                  <li className="ml-4">→ Create mockups (child)</li>
                  <li className="ml-4">→ Implement frontend (child)</li>
                  <li className="ml-4">→ User testing (child)</li>
                  <li>• <strong>Review quarterly report</strong> (standalone)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Schedule Quadrant:</h4>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Learn TypeScript</strong> (parent)</li>
                  <li className="ml-4">→ Complete online course (child)</li>
                  <li className="ml-4">→ Build practice project (child)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Delegate Quadrant:</h4>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Orphaned tasks:</strong></li>
                  <li className="ml-4">→ Update documentation</li>
                  <li className="ml-4">→ Fix typos in README</li>
                  <li className="text-xs text-gray-500 ml-4">(Parent "Documentation Overhaul" not shown)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Eliminate Quadrant:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Reply to emails (standalone)</li>
                  <li>• Organize desk (standalone)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  )
}