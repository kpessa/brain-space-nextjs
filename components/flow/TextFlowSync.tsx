'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff } from '@/lib/icons'
import { Button } from '@/components/ui/Button'
import type { BrainDumpNode } from '@/store/braindumpStore'

interface TextFlowSyncProps {
  rawText: string
  nodes: BrainDumpNode[]
  selectedNode: BrainDumpNode | null
  onTextSelect?: (text: string, position: { line: number; start: number; end: number }) => void
  onNodeHover?: (nodeId: string | null) => void
  isVisible: boolean
  onToggleVisibility: () => void
}

export function TextFlowSync({
  rawText,
  nodes,
  selectedNode,
  onTextSelect,
  onNodeHover,
  isVisible,
  onToggleVisibility,
}: TextFlowSyncProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [highlightedRanges, setHighlightedRanges] = useState<Map<string, { line: number; start: number; end: number }>>(new Map())
  const textRef = useRef<HTMLDivElement>(null)

  // Build a map of text positions for each node
  useEffect(() => {
    const ranges = new Map<string, { line: number; start: number; end: number }>()
    
    nodes.forEach(node => {
      if (node.data.textPosition) {
        ranges.set(node.id, node.data.textPosition)
      } else if (node.data.sourceText) {
        // Try to find the text in the raw text
        const lines = rawText.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const index = lines[i].indexOf(node.data.sourceText)
          if (index !== -1) {
            ranges.set(node.id, {
              line: i,
              start: index,
              end: index + node.data.sourceText.length,
            })
            break
          }
        }
      }
    })
    
    setHighlightedRanges(ranges)
  }, [nodes, rawText])

  // Scroll to selected node's text
  useEffect(() => {
    if (selectedNode && highlightedRanges.has(selectedNode.id) && textRef.current) {
      const position = highlightedRanges.get(selectedNode.id)!
      const lineElements = textRef.current.querySelectorAll('.text-line')
      if (lineElements[position.line]) {
        lineElements[position.line].scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [selectedNode, highlightedRanges])

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const selectedText = selection.toString()
    const range = selection.getRangeAt(0)
    
    // Calculate line and position
    const container = textRef.current
    if (!container) return
    
    const lines = rawText.split('\n')
    let currentLine = 0
    let currentPos = 0
    
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= selection.anchorOffset) {
        currentLine = i
        break
      }
      currentPos += lines[i].length + 1 // +1 for newline
    }
    
    if (onTextSelect) {
      onTextSelect(selectedText, {
        line: currentLine,
        start: selection.anchorOffset - currentPos,
        end: selection.focusOffset - currentPos,
      })
    }
  }

  const renderHighlightedText = () => {
    const lines = rawText.split('\n')
    
    return lines.map((line, lineIndex) => {
      const lineHighlights: Array<{ nodeId: string; start: number; end: number }> = []
      
      // Find all highlights for this line
      highlightedRanges.forEach((range, nodeId) => {
        if (range.line === lineIndex) {
          lineHighlights.push({ nodeId, start: range.start, end: range.end })
        }
      })
      
      // Sort highlights by start position
      lineHighlights.sort((a, b) => a.start - b.start)
      
      // Build the line with highlights
      const segments: React.ReactNode[] = []
      let lastEnd = 0
      
      lineHighlights.forEach(({ nodeId, start, end }) => {
        // Add text before highlight
        if (start > lastEnd) {
          segments.push(
            <span key={`text-${lineIndex}-${lastEnd}`}>
              {line.substring(lastEnd, start)}
            </span>
          )
        }
        
        // Add highlighted text
        const isSelected = selectedNode?.id === nodeId
        const isHovered = hoveredNodeId === nodeId
        
        segments.push(
          <span
            key={`highlight-${nodeId}`}
            className={`
              px-1 rounded cursor-pointer transition-all
              ${isSelected ? 'bg-blue-300 text-blue-900' : 
                isHovered ? 'bg-yellow-200 text-gray-900' : 
                'bg-gray-200 text-gray-800'}
            `}
            onMouseEnter={() => {
              setHoveredNodeId(nodeId)
              onNodeHover?.(nodeId)
            }}
            onMouseLeave={() => {
              setHoveredNodeId(null)
              onNodeHover?.(null)
            }}
            title={`Node: ${nodes.find(n => n.id === nodeId)?.data.label || nodeId}`}
          >
            {line.substring(start, end)}
          </span>
        )
        
        lastEnd = end
      })
      
      // Add remaining text
      if (lastEnd < line.length) {
        segments.push(
          <span key={`text-${lineIndex}-end`}>
            {line.substring(lastEnd)}
          </span>
        )
      }
      
      return (
        <div key={lineIndex} className="text-line">
          <span className="inline-block w-8 text-xs text-gray-400 select-none">
            {lineIndex + 1}
          </span>
          <span className="ml-2">
            {segments.length > 0 ? segments : line || '\u00A0'}
          </span>
        </div>
      )
    })
  }

  if (!isVisible) {
    return (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleVisibility}
          className="rounded-r-lg rounded-l-none shadow-lg"
          title="Show raw text"
        >
          <ChevronRight className="w-4 h-4" />
          <Eye className="w-4 h-4 ml-1" />
        </Button>
      </div>
    )
  }

  return (
    <div className="absolute left-0 top-0 bottom-0 w-96 bg-white border-r border-gray-200 shadow-lg z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h3 className="font-semibold text-sm">Raw Text</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleVisibility}
          title="Hide raw text"
        >
          <ChevronLeft className="w-4 h-4" />
          <EyeOff className="w-4 h-4 ml-1" />
        </Button>
      </div>
      
      {/* Text content */}
      <div
        ref={textRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm select-text"
        onMouseUp={handleTextSelection}
      >
        {renderHighlightedText()}
      </div>
      
      {/* Footer info */}
      <div className="p-3 border-t border-gray-200 text-xs text-gray-500">
        <div>Lines: {rawText.split('\n').length}</div>
        <div>Nodes: {nodes.length}</div>
        <div>Mapped: {highlightedRanges.size}</div>
      </div>
    </div>
  )
}