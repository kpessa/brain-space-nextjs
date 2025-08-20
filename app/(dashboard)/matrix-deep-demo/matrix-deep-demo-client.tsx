'use client'

import { useState } from 'react'
import { MatrixNodeCard } from '@/components/matrix/MatrixNodeCard'
import { QuadrantCard } from '@/components/matrix/QuadrantCard'
import { getFamilyColor } from '@/components/matrix/utils'
import { 
  getNodeDepth, 
  getAllDescendants, 
  groupNodesByDeepFamily,
  sortFamilyByHierarchy,
  getIndentLevel 
} from '@/components/matrix/utils-deep'
import { Button } from '@/components/ui/Button'
import { AlertCircle, ChevronRight, ChevronDown } from 'lucide-react'

// Sample data with DEEP nesting (4 levels)
const DEEP_NESTED_NODES = [
  // Root: Company Strategy (Level 0)
  {
    id: 'strategy-1',
    title: '🏢 Company Strategy 2024',
    description: 'Overall company strategy and initiatives',
    urgency: 9,
    importance: 10,
    type: 'goal',
    children: ['project-1', 'project-2'],
  },
  
  // Level 1: Major Projects
  {
    id: 'project-1',
    title: '📱 Digital Transformation',
    description: 'Complete digital transformation initiative',
    urgency: 9,
    importance: 9,
    type: 'project',
    parent: 'strategy-1',
    children: ['epic-1', 'epic-2'],
  },
  {
    id: 'project-2',
    title: '🌍 Market Expansion',
    description: 'Expand to new markets',
    urgency: 8,
    importance: 9,
    type: 'project',
    parent: 'strategy-1',
    children: ['epic-3'],
  },
  
  // Level 2: Epics
  {
    id: 'epic-1',
    title: '🔧 Platform Modernization',
    description: 'Modernize core platform',
    urgency: 9,
    importance: 9,
    type: 'project',
    parent: 'project-1',
    children: ['task-1', 'task-2', 'task-3'],
  },
  {
    id: 'epic-2',
    title: '☁️ Cloud Migration',
    description: 'Migrate to cloud infrastructure',
    urgency: 8,
    importance: 9,
    type: 'project',
    parent: 'project-1',
    children: ['task-4', 'task-5'],
  },
  {
    id: 'epic-3',
    title: '🎯 Asia Pacific Launch',
    description: 'Launch in APAC region',
    urgency: 8,
    importance: 8,
    type: 'project',
    parent: 'project-2',
    children: ['task-6'],
  },
  
  // Level 3: Tasks
  {
    id: 'task-1',
    title: 'Setup CI/CD Pipeline',
    urgency: 9,
    importance: 8,
    type: 'task',
    parent: 'epic-1',
    children: ['subtask-1', 'subtask-2'],
  },
  {
    id: 'task-2',
    title: 'Refactor Database Layer',
    urgency: 8,
    importance: 9,
    type: 'task',
    parent: 'epic-1',
  },
  {
    id: 'task-3',
    title: 'API Versioning',
    urgency: 8,
    importance: 8,
    type: 'task',
    parent: 'epic-1',
  },
  {
    id: 'task-4',
    title: 'AWS Setup',
    urgency: 8,
    importance: 9,
    type: 'task',
    parent: 'epic-2',
  },
  {
    id: 'task-5',
    title: 'Data Migration Plan',
    urgency: 7,
    importance: 9,
    type: 'task',
    parent: 'epic-2',
  },
  {
    id: 'task-6',
    title: 'Market Research',
    urgency: 8,
    importance: 8,
    type: 'task',
    parent: 'epic-3',
  },
  
  // Level 4: Subtasks (Grandchildren of grandchildren!)
  {
    id: 'subtask-1',
    title: 'Install Jenkins',
    urgency: 9,
    importance: 7,
    type: 'task',
    parent: 'task-1',
  },
  {
    id: 'subtask-2',
    title: 'Configure Build Scripts',
    urgency: 8,
    importance: 7,
    type: 'task',
    parent: 'task-1',
  },
  
  // Standalone task for comparison
  {
    id: 'standalone-1',
    title: '📧 Review Emails',
    urgency: 7,
    importance: 5,
    type: 'task',
  },
]

const quadrant = {
  id: 'urgent-important',
  title: 'Do First',
  description: 'Urgent & Important - Deep Nesting Demo',
  icon: <AlertCircle className="w-5 h-5" />,
  color: 'text-red-600',
  bgColor: 'bg-red-50',
}

export default function MatrixDeepDemoClient() {
  const [nodes] = useState(DEEP_NESTED_NODES)
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set(['strategy-1']))
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['strategy-1', 'project-1', 'epic-1', 'task-1'])
  )
  
  const toggleNode = (nodeId: string) => {
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
  
  const renderDeepFamily = () => {
    const families = groupNodesByDeepFamily(nodes, nodes)
    const elements: JSX.Element[] = []
    let currentIndex = 0
    
    families.forEach((familyNodes, familyId) => {
      if (familyId.startsWith('standalone-')) {
        // Render standalone nodes normally
        familyNodes.forEach(node => {
          elements.push(
            <MatrixNodeCard
              key={node.id}
              node={node}
              index={currentIndex++}
              allNodes={nodes}
            />
          )
        })
      } else {
        // Render family tree with deep nesting
        const sorted = sortFamilyByHierarchy(familyNodes, nodes)
        const familyColor = getFamilyColor(familyId)
        const rootNode = sorted[0]
        
        // Recursive rendering function
        const renderNodeWithChildren = (node: any, depth: number = 0): JSX.Element[] => {
          const nodeElements: JSX.Element[] = []
          const nodeChildren = sorted.filter(n => n.parent === node.id)
          const isExpanded = expandedNodes.has(node.id)
          const hasChildrenNodes = nodeChildren.length > 0
          
          // Render the node itself
          nodeElements.push(
            <div key={node.id} style={{ marginLeft: `${depth * 20}px` }}>
              <div className="flex items-center gap-2 mb-2">
                {hasChildrenNodes && (
                  <button
                    onClick={() => toggleNode(node.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {isExpanded ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                    }
                  </button>
                )}
                <div className="flex-1">
                  <MatrixNodeCard
                    node={node}
                    index={currentIndex++}
                    isParent={hasChildrenNodes}
                    isChild={depth > 0}
                    familyColor={familyColor}
                    indentLevel={0} // We handle indentation above
                    allNodes={nodes}
                    parentNode={depth > 0 ? nodes.find(n => n.id === node.parent) : null}
                  />
                </div>
              </div>
              
              {/* Render children if expanded */}
              {isExpanded && nodeChildren.map(child => 
                renderNodeWithChildren(child, depth + 1)
              ).flat()}
            </div>
          )
          
          return nodeElements.flat()
        }
        
        elements.push(...renderNodeWithChildren(rootNode, 0))
        elements.push(<div key={`spacer-${familyId}`} className="h-4" />)
      }
    })
    
    return elements
  }
  
  const getTreeStructure = () => {
    const renderTree = (nodeId: string, depth: number = 0): JSX.Element => {
      const node = nodes.find(n => n.id === nodeId)
      if (!node) return <></>
      
      const children = nodes.filter(n => n.parent === nodeId)
      const indent = '  '.repeat(depth)
      
      return (
        <div key={nodeId}>
          <div className="font-mono text-sm">
            {indent}
            {depth > 0 && '└─ '}
            <span className={`font-semibold ${depth === 0 ? 'text-blue-600' : depth === 1 ? 'text-green-600' : depth === 2 ? 'text-purple-600' : 'text-orange-600'}`}>
              Level {depth}:
            </span>{' '}
            {node.title}
          </div>
          {children.map(child => renderTree(child.id, depth + 1))}
        </div>
      )
    }
    
    return nodes
      .filter(n => !n.parent)
      .map(root => renderTree(root.id, 0))
  }
  
  return (
    <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold text-white mb-2">
              Deep Nesting Demo - 4 Levels
            </h1>
            <p className="text-white/80 text-lg">
              Demonstrating deeply nested parent-child relationships
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-white">
            <h3 className="font-semibold mb-2">Tree Structure:</h3>
            <div className="bg-black/20 p-3 rounded">
              {getTreeStructure()}
            </div>
            <div className="mt-3 text-sm">
              <p>• <span className="text-blue-400">Level 0</span>: Company Strategy (Root)</p>
              <p>• <span className="text-green-400">Level 1</span>: Major Projects</p>
              <p>• <span className="text-purple-400">Level 2</span>: Epics</p>
              <p>• <span className="text-orange-400">Level 3</span>: Tasks & Subtasks</p>
            </div>
          </div>
        </header>
        
        <QuadrantCard
          quadrant={quadrant}
          totalNodes={nodes.length}
          visibleCount={nodes.length}
          remainingCount={0}
          onAddClick={() => console.log('Add')}
          onLoadMore={() => console.log('Load more')}
        >
          {renderDeepFamily()}
        </QuadrantCard>
        
        <div className="mt-8 bg-white rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Features Demonstrated:</h3>
          <ul className="space-y-2 text-sm">
            <li>✅ <strong>4 levels deep</strong> - Strategy → Projects → Epics → Tasks → Subtasks</li>
            <li>✅ <strong>Visual hierarchy</strong> - Indentation increases with depth</li>
            <li>✅ <strong>Expand/Collapse</strong> - Click chevrons to show/hide children</li>
            <li>✅ <strong>Color consistency</strong> - Entire family shares the same accent color</li>
            <li>✅ <strong>Parent indicators</strong> - Folder icons and bold text for parents</li>
            <li>✅ <strong>Child indicators</strong> - Indentation and thinner borders</li>
          </ul>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm">
              <strong>Note:</strong> The current implementation supports 1-level relationships well. 
              For deeper nesting like this demo, you'd need to update the matrix-client.tsx to use 
              the enhanced utils-deep.ts functions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}