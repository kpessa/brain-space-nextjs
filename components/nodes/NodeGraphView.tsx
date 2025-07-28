'use client'

import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  Node as FlowNode,
  Edge as FlowEdge,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/Button'
import { GraphNode } from './GraphNode'
import type { Node } from '@/types/node'
import { getNodeTypeColor } from '@/types/node'
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Home } from 'lucide-react'

const nodeTypes = {
  custom: GraphNode,
}

// Layout algorithm for positioning nodes
function calculateNodePositions(nodes: Node[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const visited = new Set<string>()
  const levels = new Map<string, number>()
  
  // Find root nodes (nodes without parents)
  const rootNodes = nodes.filter(node => !node.parent || !nodes.find(n => n.id === node.parent))
  
  // BFS to assign levels
  const queue: { node: Node; level: number }[] = rootNodes.map(node => ({ node, level: 0 }))
  
  while (queue.length > 0) {
    const { node, level } = queue.shift()!
    if (visited.has(node.id)) continue
    
    visited.add(node.id)
    levels.set(node.id, level)
    
    // Add children to queue
    const children = nodes.filter(n => n.parent === node.id)
    children.forEach(child => {
      queue.push({ node: child, level: level + 1 })
    })
  }
  
  // Group nodes by level
  const nodesByLevel = new Map<number, Node[]>()
  nodes.forEach(node => {
    const level = levels.get(node.id) ?? 0
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, [])
    }
    nodesByLevel.get(level)!.push(node)
  })
  
  // Calculate positions
  const levelHeight = 150
  const nodeWidth = 250
  const nodeSpacing = 50
  
  nodesByLevel.forEach((levelNodes, level) => {
    const totalWidth = levelNodes.length * (nodeWidth + nodeSpacing) - nodeSpacing
    const startX = -totalWidth / 2
    
    levelNodes.forEach((node, index) => {
      positions.set(node.id, {
        x: startX + index * (nodeWidth + nodeSpacing),
        y: level * levelHeight,
      })
    })
  })
  
  return positions
}

interface NodeGraphViewProps {
  nodes: Node[]
  onNodeClick?: (node: Node) => void
  onCreateChild?: (node: Node) => void
  onCreateParent?: (node: Node) => void
}

function NodeGraphViewInner({ nodes, onNodeClick, onCreateChild, onCreateParent }: NodeGraphViewProps) {
  const { fitView } = useReactFlow()
  
  // Calculate positions for nodes
  const positions = useMemo(() => calculateNodePositions(nodes), [nodes])
  
  // Convert nodes to ReactFlow format
  const flowNodes = useMemo<FlowNode[]>(() => {
    return nodes.map(node => ({
      id: node.id,
      type: 'custom',
      position: positions.get(node.id) || { x: 0, y: 0 },
      data: {
        node,
        onNodeClick,
        onCreateChild,
        onCreateParent,
      },
    }))
  }, [nodes, positions, onNodeClick, onCreateChild, onCreateParent])
  
  // Convert relationships to edges
  const flowEdges = useMemo<FlowEdge[]>(() => {
    const edges: FlowEdge[] = []
    
    nodes.forEach(node => {
      if (node.parent) {
        const parentNode = nodes.find(n => n.id === node.parent)
        if (parentNode) {
          edges.push({
            id: `${node.parent}-${node.id}`,
            source: node.parent,
            target: node.id,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: '#9CA3AF',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#9CA3AF',
            },
          })
        }
      }
    })
    
    return edges
  }, [nodes])
  
  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState(flowEdges)
  
  // Update nodes when props change
  useEffect(() => {
    setNodes(flowNodes)
  }, [flowNodes, setNodes])
  
  useEffect(() => {
    setEdges(flowEdges)
  }, [flowEdges, setEdges])
  
  // Fit view on mount and when nodes change
  useEffect(() => {
    setTimeout(() => {
      fitView({ padding: 0.2 })
    }, 100)
  }, [fitView, nodes.length])
  
  const handleHome = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 })
  }, [fitView])

  return (
    <div className="h-[600px] bg-gray-50 rounded-lg overflow-hidden">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#E5E7EB" />
        <Controls 
          showInteractive={false}
          position="top-right"
        >
          <button
            onClick={handleHome}
            className="react-flow__controls-button"
            title="Fit to view"
          >
            <Home className="w-4 h-4" />
          </button>
        </Controls>
        <MiniMap 
          nodeColor={(node) => {
            const nodeData = node.data?.node
            if (!nodeData) return '#9CA3AF'
            const colorClass = getNodeTypeColor(nodeData.type)
            // Extract color from tailwind class
            if (colorClass.includes('purple')) return '#9333EA'
            if (colorClass.includes('blue')) return '#3B82F6'
            if (colorClass.includes('green')) return '#10B981'
            if (colorClass.includes('red')) return '#EF4444'
            if (colorClass.includes('yellow')) return '#F59E0B'
            if (colorClass.includes('pink')) return '#EC4899'
            if (colorClass.includes('indigo')) return '#6366F1'
            if (colorClass.includes('teal')) return '#14B8A6'
            if (colorClass.includes('orange')) return '#F97316'
            return '#6B7280'
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  )
}

export function NodeGraphView(props: NodeGraphViewProps) {
  return (
    <ReactFlowProvider>
      <NodeGraphViewInner {...props} />
    </ReactFlowProvider>
  )
}