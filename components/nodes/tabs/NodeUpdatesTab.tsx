'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useNodesStore } from '@/store/nodes'
import { useXPStore } from '@/store/xpStore'
import { useToast } from '@/hooks/useToast'
import { useXPAnimation } from '@/components/XPGainAnimationCSS'
import type { Node, NodeUpdate } from '@/types/node'
import { XPEventType } from '@/types/xp'
import { MessageSquare, Trash2, Plus, X, Sparkles } from '@/lib/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface NodeUpdatesTabProps {
  node: Node
  userId: string
  userName?: string
}

export function NodeUpdatesTab({ node, userId, userName }: NodeUpdatesTabProps) {
  const [newUpdateContent, setNewUpdateContent] = useState('')
  const [updateType, setUpdateType] = useState<'note' | 'status' | 'progress'>('note')
  const [isAddingUpdate, setIsAddingUpdate] = useState(false)
  const [enableAIEnhancement, setEnableAIEnhancement] = useState(true)
  const [isEnhancing, setIsEnhancing] = useState(false)
  
  const toast = useToast()
  const { awardXP } = useXPStore()
  const { showXPGain } = useXPAnimation()
  const { addNodeUpdate, deleteNodeUpdate } = useNodesStore()

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newUpdateContent.trim()) return
    
    setIsEnhancing(enableAIEnhancement)
    
    try {
      let content = newUpdateContent.trim()
      
      // Enhance with AI if enabled
      if (enableAIEnhancement) {
        try {
          const response = await fetch('/api/ai/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text: content,
              type: 'update',
              nodeContext: {
                title: node.title,
                type: node.type,
                description: node.description
              }
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            content = data.enhanced || content
          }
        } catch (error) {
          // Fall back to original content if enhancement fails
        }
      }
      
      await addNodeUpdate(node.id, {
        content,
        type: updateType,
        timestamp: new Date().toISOString(),
        author: userName || 'User'
      })
      
      // Award XP for adding an update
      const xpAwarded = awardXP(XPEventType.UPDATE_NODE, userId)
      if (xpAwarded > 0) {
        showXPGain(xpAwarded)
      }
      
      toast.showSuccess('Update added!')
      setNewUpdateContent('')
      setIsAddingUpdate(false)
    } catch (error) {
      toast.showError('Failed to add update')
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleDeleteUpdate = async (updateId: string) => {
    if (confirm('Are you sure you want to delete this update?')) {
      try {
        await deleteNodeUpdate(node.id, updateId)
        toast.showSuccess('Update deleted')
      } catch (error) {
        toast.showError('Failed to delete update')
      }
    }
  }

  const getUpdateIcon = (type: NodeUpdate['type']) => {
    switch (type) {
      case 'status':
        return '📊'
      case 'progress':
        return '✅'
      case 'note':
      default:
        return '📝'
    }
  }

  const getUpdateColor = (type: NodeUpdate['type']) => {
    switch (type) {
      case 'status':
        return 'bg-blue-50 border-blue-200'
      case 'progress':
        return 'bg-green-50 border-green-200'
      case 'note':
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Add Update Form */}
      {isAddingUpdate ? (
        <form onSubmit={handleAddUpdate} className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Type
            </label>
            <select
              value={updateType}
              onChange={(e) => setUpdateType(e.target.value as typeof updateType)}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brain-500"
            >
              <option value="note">Note</option>
              <option value="status">Status Update</option>
              <option value="progress">Progress Update</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <textarea
              value={newUpdateContent}
              onChange={(e) => setNewUpdateContent(e.target.value)}
              className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-brain-500 min-h-[100px]"
              placeholder="What's the update?"
              autoFocus
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableAI"
              checked={enableAIEnhancement}
              onChange={(e) => setEnableAIEnhancement(e.target.checked)}
              className="rounded border-gray-300 text-brain-600 focus:ring-brain-500"
            />
            <label htmlFor="enableAI" className="text-sm text-gray-700 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              Enhance with AI
            </label>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={!newUpdateContent.trim() || isEnhancing}
            >
              {isEnhancing ? 'Enhancing...' : 'Add Update'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAddingUpdate(false)
                setNewUpdateContent('')
              }}
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAddingUpdate(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Update
        </Button>
      )}
      
      {/* Updates List */}
      <div className="space-y-3">
        {node.updates && node.updates.length > 0 ? (
          [...node.updates]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((update) => (
              <div
                key={update.id}
                className={`p-4 rounded-lg border ${getUpdateColor(update.type)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getUpdateIcon(update.type)}</span>
                    <span className="text-sm font-medium text-gray-700">
                      {update.type === 'status' ? 'Status' : 
                       update.type === 'progress' ? 'Progress' : 'Note'}
                    </span>
                    <span className="text-xs text-gray-500">
                      by {update.author}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteUpdate(update.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-gray-700 whitespace-pre-wrap mb-2">
                  {update.content}
                </p>
                
                <div className="text-xs text-gray-500">
                  {dayjs(update.timestamp).fromNow()}
                </div>
              </div>
            ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No updates yet</p>
            <p className="text-sm mt-1">Add updates to track progress and notes</p>
          </div>
        )}
      </div>
    </div>
  )
}