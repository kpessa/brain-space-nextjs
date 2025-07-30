'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AIProviderSelector } from '@/components/AIProviderSelector'
import { createAIService } from '@/services/ai'
import { useNodesStore } from '@/store/nodeStore'
import { useUserPreferencesStore } from '@/store/userPreferencesStore'
import { useToast } from '@/hooks/useToast'
import type { Node, NodeType } from '@/types/node'
import { getNodeTypeIcon, getNodeTypeColor } from '@/types/node'
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2,
  X,
  Tag,
  AlertTriangle,
  Target,
  Info
} from 'lucide-react'

interface ReenhanceNodeDialogProps {
  isOpen: boolean
  onClose: () => void
  node: Node
  onSuccess?: () => void
}

interface EnhancedData {
  type: NodeType
  title: string
  description: string
  tags: string[]
  urgency: number
  importance: number
  isPersonal?: boolean
}

export function ReenhanceNodeDialog({ 
  isOpen, 
  onClose, 
  node,
  onSuccess 
}: ReenhanceNodeDialogProps) {
  const [provider, setProvider] = useState<'openai' | 'google' | 'anthropic'>('openai')
  const [loading, setLoading] = useState(false)
  const [enhancedData, setEnhancedData] = useState<EnhancedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const { updateNode, nodes } = useNodesStore()
  const { currentMode } = useUserPreferencesStore()
  const toast = useToast()
  
  const handleEnhance = async () => {
    setLoading(true)
    setError(null)
    setEnhancedData(null)
    
    try {
      const aiService = createAIService(provider)
      
      // Get all existing tags for context
      const existingTags = Array.from(new Set(
        nodes.flatMap(n => n.tags || [])
      ))
      
      // Combine title and description for better context
      const content = `${node.title}\n\n${node.description || ''}`
      
      const result = await aiService.enhanceNode(content, currentMode, existingTags)
      
      if (result.nodeData) {
        setEnhancedData({
          type: result.nodeData.type as NodeType,
          title: result.nodeData.title || node.title,
          description: result.nodeData.description || node.description || '',
          tags: result.nodeData.tags || node.tags || [],
          urgency: result.nodeData.urgency || node.urgency || 5,
          importance: result.nodeData.importance || node.importance || 5,
          isPersonal: result.nodeData.isPersonal
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enhance node')
      console.error('Enhancement error:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleApplyChanges = async () => {
    if (!enhancedData) return
    
    try {
      console.log('Updating node with enhanced data:', {
        nodeId: node.id,
        tags: enhancedData.tags,
        originalTags: node.tags
      })
      
      await updateNode(node.id, {
        type: enhancedData.type,
        title: enhancedData.title,
        description: enhancedData.description,
        tags: enhancedData.tags,
        urgency: enhancedData.urgency,
        importance: enhancedData.importance,
        isPersonal: enhancedData.isPersonal
      })
      
      toast.success('Node enhanced successfully!')
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error('Failed to update node')
      console.error('Update error:', err)
    }
  }
  
  const handleReset = () => {
    setEnhancedData(null)
    setError(null)
  }
  
  const renderComparison = () => {
    if (!enhancedData) return null
    
    const hasChanges = {
      type: node.type !== enhancedData.type,
      title: node.title !== enhancedData.title,
      description: node.description !== enhancedData.description,
      tags: JSON.stringify(node.tags?.sort()) !== JSON.stringify(enhancedData.tags?.sort()),
      urgency: node.urgency !== enhancedData.urgency,
      importance: node.importance !== enhancedData.importance,
    }
    
    const noChanges = !Object.values(hasChanges).some(changed => changed)
    
    if (noChanges) {
      return (
        <div className="text-center py-8">
          <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">The AI didn't suggest any changes for this node.</p>
          <p className="text-sm text-gray-500 mt-2">The current categorization looks good!</p>
        </div>
      )
    }
    
    return (
      <div className="space-y-6">
        {/* Type */}
        {hasChanges.type && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Type</label>
            <div className="flex items-center gap-4">
              <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                <span className={`inline-flex items-center gap-2 text-sm ${getNodeTypeColor(node.type)}`}>
                  {getNodeTypeIcon(node.type)} {node.type}
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="flex-1 p-3 bg-green-50 rounded-lg">
                <span className={`inline-flex items-center gap-2 text-sm ${getNodeTypeColor(enhancedData.type)}`}>
                  {getNodeTypeIcon(enhancedData.type)} {enhancedData.type}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Title */}
        {hasChanges.title && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Title</label>
            <div className="flex items-start gap-4">
              <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm">{node.title}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 mt-3" />
              <div className="flex-1 p-3 bg-green-50 rounded-lg">
                <p className="text-sm">{enhancedData.title}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Description */}
        {hasChanges.description && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{node.description || 'No description'}</p>
              </div>
              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-800">{enhancedData.description}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Tags */}
        {hasChanges.tags && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Tags
            </label>
            <div className="flex items-start gap-4">
              <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-wrap gap-1">
                  {(node.tags || []).length > 0 ? (
                    node.tags?.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">No tags</span>
                  )}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 mt-3" />
              <div className="flex-1 p-3 bg-green-50 rounded-lg">
                <div className="flex flex-wrap gap-1">
                  {enhancedData.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Priority Scores */}
        {(hasChanges.urgency || hasChanges.importance) && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Target className="w-4 h-4" /> Priority Scores
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Urgency</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{node.urgency || 5}</span>
                  {hasChanges.urgency && (
                    <>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-green-600">{enhancedData.urgency}</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Importance</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{node.importance || 5}</span>
                  {hasChanges.importance && (
                    <>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-green-600">{enhancedData.importance}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Re-enhance Node with AI"
      size="lg"
    >
      <div className="space-y-6">
        {!enhancedData && !error && (
          <>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-brain-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-brain-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Enhance "{node.title}" with AI</h3>
              <p className="text-gray-600 text-sm max-w-md mx-auto">
                The AI will analyze your node content and suggest improvements to the title, description, 
                type, tags, and priority scores.
              </p>
            </div>
            
            <div className="space-y-4">
              <AIProviderSelector
                value={provider}
                onChange={setProvider}
              />
              
              <Button
                onClick={handleEnhance}
                variant="primary"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Enhance Node
                  </>
                )}
              </Button>
            </div>
          </>
        )}
        
        {error && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Enhancement Failed</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                Try Again
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        
        {enhancedData && (
          <div className="space-y-6">
            <div className="max-h-[400px] overflow-y-auto">
              {renderComparison()}
            </div>
            
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                <X className="w-4 h-4 mr-1" />
                Try Again
              </Button>
              <Button
                onClick={handleApplyChanges}
                variant="primary"
                className="flex-1"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Apply Changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}