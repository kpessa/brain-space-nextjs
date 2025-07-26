'use client'

import { useState, useRef, useEffect } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import {
  Edit2,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Crown,
  Link2,
  Target,
  Plus,
  Calendar,
  Repeat,
} from 'lucide-react'
import { useBrainDumpStore } from '@/store/braindumpStore'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useRouter } from 'next/navigation'

const categoryColors: Record<string, string> = {
  ideas: 'bg-blue-50 border-blue-300 text-blue-900',
  tasks: 'bg-green-50 border-green-300 text-green-900',
  questions: 'bg-amber-50 border-amber-300 text-amber-900',
  insights: 'bg-purple-50 border-purple-300 text-purple-900',
  problems: 'bg-red-50 border-red-300 text-red-900',
  misc: 'bg-gray-50 border-gray-300 text-gray-900',
}

interface ThoughtNodeProps {
  id: string
  data: {
    label: string
    category?: string
    isCollapsed?: boolean
    hasTopicBrainDump?: boolean
    topicBrainDumpId?: string
    children?: any[]
    width?: number
    height?: number
    importance?: number
    urgency?: number
    dueDate?: string
    taskType?: string
    recurrencePattern?: any
    synonyms?: string[]
    instances?: any[]
    isInstance?: boolean
    isGhost?: boolean
    style?: {
      backgroundColor?: string
      borderColor?: string
      textColor?: string
      borderStyle?: string
      borderWidth?: number
      icon?: string
    }
  }
  selected?: boolean
}

export function ThoughtNode({ id, data, selected }: ThoughtNodeProps) {
  const router = useRouter()
  const { updateNode, deleteNode, toggleNodeCollapse, entries, setCurrentEntry } = useBrainDumpStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(data.label)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [width, setWidth] = useState(data.width || 200)
  const [height, setHeight] = useState(data.height || 'auto')
  const nodeRef = useRef<HTMLDivElement>(null)

  const category = data.category || 'misc'
  const defaultColorClass = categoryColors[category] || categoryColors.misc
  const isCollapsed = data.isCollapsed || false
  const hasChildren = data.children && data.children.length > 0
  const isPrototype = data.instances && data.instances.length > 0
  const isInstance = data.isInstance
  const isTopicGhost = data.isGhost && data.hasTopicBrainDump

  // Apply custom styles if available
  const customStyle = data.style
    ? {
        backgroundColor: data.style.backgroundColor,
        borderColor: data.style.borderColor,
        color: data.style.textColor,
        borderStyle: data.style.borderStyle as any,
        borderWidth: data.style.borderWidth ? `${data.style.borderWidth}px` : undefined,
      }
    : {}

  const handleSave = () => {
    updateNode(id, { data: { ...data, label: editText } })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditText(data.label)
    setIsEditing(false)
  }

  const handleDelete = () => {
    deleteNode(id)
    setShowDeleteDialog(false)
  }

  const handleAddChild = () => {
    // Emit a custom event that BrainDumpFlow can listen to
    const event = new CustomEvent('node:addChild', { detail: { nodeId: id } })
    window.dispatchEvent(event)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    // Check if click is on a resize handle
    const target = e.target as HTMLElement
    if (target.closest('.react-flow__resize-control')) {
      return
    }

    // If has topic brain dump, navigate to it
    if (data.hasTopicBrainDump && data.topicBrainDumpId) {
      const topicEntry = entries.find(e => e.id === data.topicBrainDumpId)
      if (topicEntry) {
        setCurrentEntry(topicEntry)
        router.push('/braindump')
        return
      }
    }

    // Otherwise, enter edit mode
    setIsEditing(true)
  }

  return (
    <div className="relative group/wrapper" ref={nodeRef}>
      <NodeResizer
        isVisible={selected}
        minWidth={100}
        minHeight={30}
        onResize={(_, params) => {
          setWidth(params.width)
          setHeight(params.height)
        }}
        handleStyle={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          border: '2px solid white',
          cursor: 'pointer',
        }}
        lineStyle={{
          borderColor: '#3b82f6',
          borderWidth: '1px',
        }}
      />
      <div
        className={`px-3 py-2 shadow-md rounded-lg border-2 min-w-[200px] cursor-pointer select-none group/node relative ${
          data.style ? '' : defaultColorClass
        } ${isInstance || isTopicGhost ? 'border-dashed' : 'border-solid'} ${
          isTopicGhost ? 'opacity-75 hover:opacity-100 transition-opacity' : ''
        }`}
        style={{
          ...customStyle,
          width: width ? `${width}px` : 'auto',
          height: height !== 'auto' ? `${height}px` : 'auto',
          maxWidth: '400px',
        }}
        onDoubleClick={handleDoubleClick}
        title={
          data.hasTopicBrainDump ? 'Double-click to open topic brain dump' : 'Double-click to edit'
        }
      >
        {/* Prototype/Instance indicator */}
        {isPrototype && (
          <div
            className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 shadow-sm z-10"
            title="Prototype node"
          >
            <Crown className="w-3 h-3 text-yellow-900" />
          </div>
        )}
        {isInstance && (
          <div
            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm border z-10"
            title="Instance node"
          >
            <Link2 className="w-3 h-3 text-gray-600" />
          </div>
        )}

        {/* Topic brain dump indicator */}
        {data.hasTopicBrainDump && (
          <div
            className="absolute -top-2 -left-2 bg-brain-600 rounded-full p-1 shadow-sm z-10"
            title="Has topic brain dump - double click to open"
          >
            <Target className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Synonym count badge */}
        {data.synonyms && data.synonyms.length > 0 && (
          <div
            className={`absolute -top-2 ${data.hasTopicBrainDump ? 'left-6' : '-left-2'} bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-sm z-10`}
            title={`${data.synonyms.length} synonym${data.synonyms.length > 1 ? 's' : ''}`}
          >
            {data.synonyms.length}
          </div>
        )}

        {/* Recurring task indicator */}
        {(data.taskType === 'recurring' || data.taskType === 'habit') && (
          <div
            className={`absolute -bottom-2 ${
              data.dueDate ? 'left-6' : '-left-2'
            } px-2 py-1 rounded-full text-xs font-medium border shadow-sm z-10 bg-purple-100 border-purple-300 text-purple-700`}
            title={`${data.taskType === 'habit' ? 'Habit' : 'Recurring task'} - ${data.recurrencePattern?.type || 'custom'}`}
          >
            <div className="flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              <span>{data.taskType === 'habit' ? 'Habit' : 'Recurring'}</span>
            </div>
          </div>
        )}

        {/* Due date indicator */}
        {data.dueDate && (
          <div
            className={`absolute -bottom-2 ${
              data.importance !== undefined || data.urgency !== undefined ? 'right-6' : '-right-2'
            } px-2 py-1 rounded-full text-xs font-medium border shadow-sm z-10 bg-yellow-100 border-yellow-300 text-yellow-700`}
            title={`Due: ${data.dueDate}`}
          >
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Due</span>
            </div>
          </div>
        )}

        {/* Handles for connections */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          isConnectable={true}
          className="w-3 h-3 !bg-blue-500 opacity-60 group-hover/node:opacity-100 hover:!opacity-100 transition-opacity border-2 border-white"
        />
        <Handle
          type="source"
          position={Position.Top}
          id="top-source"
          isConnectable={true}
          className="w-3 h-3 !bg-blue-500 opacity-0"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        />
        <Handle
          type="target"
          position={Position.Right}
          id="right"
          isConnectable={true}
          className="w-3 h-3 !bg-blue-500 opacity-60 group-hover/node:opacity-100 hover:!opacity-100 transition-opacity border-2 border-white"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right-source"
          isConnectable={true}
          className="w-3 h-3 !bg-blue-500 opacity-0"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        />
        <Handle
          type="target"
          position={Position.Bottom}
          id="bottom"
          isConnectable={true}
          className="w-3 h-3 !bg-blue-500 opacity-60 group-hover/node:opacity-100 hover:!opacity-100 transition-opacity border-2 border-white"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom-source"
          isConnectable={true}
          className="w-3 h-3 !bg-blue-500 opacity-0"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          isConnectable={true}
          className="w-3 h-3 !bg-blue-500 opacity-60 group-hover/node:opacity-100 hover:!opacity-100 transition-opacity border-2 border-white"
        />
        <Handle
          type="source"
          position={Position.Left}
          id="left-source"
          isConnectable={true}
          className="w-3 h-3 !bg-blue-500 opacity-0"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        />

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSave()
                } else if (e.key === 'Escape') {
                  handleCancel()
                }
              }}
              onFocus={e => e.target.select()}
              className="w-full p-1 text-sm rounded border border-gray-300 resize-none"
              rows={Math.max(1, editText.split('\n').length)}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Enter to save • Shift+Enter for new line
              </span>
              <div className="flex gap-1">
                <button
                  onClick={handleSave}
                  className="p-1 hover:bg-green-200 rounded transition-colors"
                  title="Save (Enter)"
                >
                  <Check className="w-3 h-3 text-green-600" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1 hover:bg-red-200 rounded transition-colors"
                  title="Cancel (Esc)"
                >
                  <X className="w-3 h-3 text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="group">
            <div className="flex items-center gap-1">
              {hasChildren && (
                <button
                  onClick={() => toggleNodeCollapse(id)}
                  className="hover:bg-gray-200 rounded p-0.5 transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
              {data.style?.icon && <span className="text-lg mr-1">{data.style.icon}</span>}
              <div className="text-sm flex-1">{data.label}</div>
              {hasChildren && (
                <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                  {data.children.length}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit/Delete/Add Child buttons */}
      {!isEditing && (
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover/wrapper:opacity-100 transition-opacity">
          {!data.hasTopicBrainDump && (
            <button
              onClick={handleAddChild}
              className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-green-100 hover:border-green-300 transition-colors"
              title="Add child node"
            >
              <Plus className="w-3 h-3 text-green-600" />
            </button>
          )}
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-100 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3 h-3 text-gray-600" />
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-red-100 hover:border-red-300 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3 text-red-600" />
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Thought"
        message="Are you sure you want to delete this thought?"
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  )
}