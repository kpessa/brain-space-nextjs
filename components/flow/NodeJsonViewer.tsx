'use client'

import { useState } from 'react'
import { X, Copy, Check, Edit2, Save } from '@/lib/icons'
import { Button } from '@/components/ui/Button'
import type { BrainDumpNode } from '@/store/braindumpStore'

interface NodeJsonViewerProps {
  node: BrainDumpNode | null
  isOpen: boolean
  onClose: () => void
  onSave?: (updatedNode: BrainDumpNode) => void
  position?: { x: number; y: number }
}

export function NodeJsonViewer({ node, isOpen, onClose, onSave, position }: NodeJsonViewerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedJson, setEditedJson] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !node) return null

  const jsonString = JSON.stringify(node, null, 2)

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEdit = () => {
    setEditedJson(jsonString)
    setIsEditing(true)
    setError(null)
  }

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editedJson)
      if (onSave) {
        onSave(parsed)
      }
      setIsEditing(false)
      setError(null)
    } catch (e) {
      setError('Invalid JSON format')
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedJson('')
    setError(null)
  }

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200"
      style={{
        right: position?.x || 20,
        top: position?.y || 80,
        maxWidth: '500px',
        maxHeight: '80vh',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Node JSON</h3>
          <span className="text-xs text-gray-500">ID: {node.id}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && onSave && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="h-7"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </>
            )}
          </Button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-auto" style={{ maxHeight: 'calc(80vh - 100px)' }}>
        {isEditing ? (
          <div className="p-3">
            <textarea
              value={editedJson}
              onChange={(e) => setEditedJson(e.target.value)}
              className="w-full h-96 p-2 font-mono text-xs border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
            />
            {error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
          </div>
        ) : (
          <pre className="p-3 text-xs font-mono overflow-x-auto">
            <code className="language-json">{jsonString}</code>
          </pre>
        )}
      </div>

      {/* Footer for edit mode */}
      {isEditing && (
        <div className="flex items-center justify-end gap-2 p-3 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
          >
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
        </div>
      )}
    </div>
  )
}