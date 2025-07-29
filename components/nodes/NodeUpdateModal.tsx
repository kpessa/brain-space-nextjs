'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useNodesStore } from '@/store/nodeStore'
import { useXPStore } from '@/store/xpStore'
import { XPEventType } from '@/types/xp'
import type { Node, NodeUpdate } from '@/types/node'
import { createAIService } from '@/services/ai'
import { useXPAnimation } from '@/components/XPGainAnimation'
import { MessageSquare, Pin, Clock, User, Trash2, Plus, Sparkles, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/useToast'

interface NodeUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  node: Node
  userId: string
  userName?: string
}

export function NodeUpdateModal({ isOpen, onClose, node, userId, userName }: NodeUpdateModalProps) {
  const [newUpdateContent, setNewUpdateContent] = useState('')
  const [updateType, setUpdateType] = useState<'note' | 'status' | 'progress'>('note')
  const [isAddingUpdate, setIsAddingUpdate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [enableAIEnhancement, setEnableAIEnhancement] = useState(true) // Default checked
  const [isEnhancing, setIsEnhancing] = useState(false)
  const { addNodeUpdate, deleteNodeUpdate } = useNodesStore()
  const { awardXP } = useXPStore()
  const { showXPGain } = useXPAnimation()
  const toast = useToast()
  const aiService = createAIService()
  
  const sortedUpdates = [...(node.updates || [])]
    .sort((a, b) => {
      // Pinned updates first
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      // Then by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  
  const handleEnhanceContent = async () => {
    if (!newUpdateContent.trim() || isEnhancing) return
    
    setIsEnhancing(true)
    try {
      const response = await fetch('/api/ai/enhance-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newUpdateContent,
          isWorkNode: !node.isPersonal,
          updateType,
        }),
      })
      
      if (response.ok) {
        const { enhancedText } = await response.json()
        setNewUpdateContent(enhancedText)
        toast.success('Update enhanced with AI!')
      } else {
        toast.error('Failed to enhance update')
      }
    } catch (error) {
      console.error('Error enhancing update:', error)
      toast.error('Failed to enhance update')
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUpdateContent.trim()) return
    
    setLoading(true)
    try {
      await addNodeUpdate(node.id, {
        content: newUpdateContent.trim(),
        type: updateType,
        userId,
        userName,
      })
      
      // Award XP based on update type
      const xpEventType = updateType === 'progress' 
        ? XPEventType.NODE_UPDATE_PROGRESS 
        : updateType === 'status'
        ? XPEventType.NODE_UPDATE_STATUS
        : XPEventType.NODE_UPDATE_ADDED
        
      const { xpAwarded, leveledUp } = await awardXP(xpEventType, {
        nodeId: node.id,
        nodeTitle: node.title,
        updateCount: node.updates?.length || 0
      })
      
      // Show XP animation
      showXPGain(xpAwarded, e.nativeEvent as MouseEvent)
      
      if (leveledUp) {
        toast.success('Level Up! 🎉')
      }
      
      setNewUpdateContent('')
      setIsAddingUpdate(false)
      toast.success('Update added successfully!')
    } catch (error) {
      console.error('Failed to add update:', error)
      toast.error('Failed to add update')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDeleteUpdate = async (updateId: string) => {
    if (!window.confirm('Are you sure you want to delete this update?')) return
    
    try {
      await deleteNodeUpdate(node.id, updateId)
    } catch (error) {
      // Failed to delete update
    }
  }
  
  const getUpdateTypeColor = (type?: NodeUpdate['type']) => {
    switch (type) {
      case 'status': return 'bg-blue-100 text-blue-800'
      case 'progress': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getUpdateTypeIcon = (type?: NodeUpdate['type']) => {
    switch (type) {
      case 'status': return '📊'
      case 'progress': return '🚀'
      default: return '📝'
    }
  }
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Updates for: ${node.title || 'Untitled Node'}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Add Update Section */}
        <div className="border-b pb-4">
          {isAddingUpdate ? (
            <form onSubmit={handleAddUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Type
                </label>
                <div className="flex gap-2">
                  {(['note', 'status', 'progress'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setUpdateType(type)}
                      className={`px-3 py-1 text-sm rounded-lg capitalize transition-colors ${
                        updateType === type
                          ? getUpdateTypeColor(type)
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {getUpdateTypeIcon(type)} {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Update Content
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={enableAIEnhancement}
                      onChange={(e) => setEnableAIEnhancement(e.target.checked)}
                      className="rounded text-brain-600"
                    />
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      AI Enhancement
                    </span>
                  </label>
                </div>
                <div className="relative">
                  <textarea
                    value={newUpdateContent}
                    onChange={(e) => setNewUpdateContent(e.target.value)}
                    className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                    placeholder="What's the latest on this node?"
                    autoFocus
                  />
                  {enableAIEnhancement && newUpdateContent.trim() && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleEnhanceContent}
                      disabled={isEnhancing}
                      className="absolute bottom-2 right-2"
                    >
                      {isEnhancing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                          Enhancing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1" />
                          Enhance
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || !newUpdateContent.trim()}
                  className="flex-1"
                >
                  {loading ? 'Adding...' : 'Add Update'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddingUpdate(false)
                    setNewUpdateContent('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              onClick={() => setIsAddingUpdate(true)}
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Update
            </Button>
          )}
        </div>
        
        {/* Updates List */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {sortedUpdates.length > 0 ? (
            sortedUpdates.map((update) => (
              <div
                key={update.id}
                className={`p-4 rounded-lg border ${
                  update.isPinned ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-md ${getUpdateTypeColor(update.type)}`}>
                      {getUpdateTypeIcon(update.type)} {update.type || 'note'}
                    </span>
                    {update.isPinned && (
                      <Pin className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>
                  
                  {update.userId === userId && (
                    <button
                      onClick={() => handleDeleteUpdate(update.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <p className="text-gray-800 whitespace-pre-wrap mb-3">{update.content}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{update.userName || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No updates yet</p>
              <p className="text-sm text-gray-400 mt-1">Add the first update to track progress</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}