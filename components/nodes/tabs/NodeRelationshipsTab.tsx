'use client'

import { Button } from '@/components/ui/Button'
import { useNodesStore } from '@/store/nodeStore'
import { useToast } from '@/hooks/useToast'
import type { Node } from '@/types/node'
import { getNodeTypeIcon } from '@/types/node'
import { GitBranch, GitMerge, Plus, Trash2, Link } from '@/lib/icons'

interface NodeRelationshipsTabProps {
  node: Node
  parent: Node | null | undefined
  children: Node[]
  onCreateChild?: (node: Node) => void
  onCreateParent?: (node: Node) => void
  onRelationshipChange?: () => void
  refreshKey: number
}

export function NodeRelationshipsTab({
  node,
  parent,
  children,
  onCreateChild,
  onCreateParent,
  onRelationshipChange,
  refreshKey
}: NodeRelationshipsTabProps) {
  const toast = useToast()
  const { unlinkNodes } = useNodesStore()

  const handleUnlinkParent = async () => {
    if (!parent) return
    
    if (confirm(`Are you sure you want to unlink "${node.title}" from "${parent.title}"?`)) {
      try {
        await unlinkNodes(parent.id, node.id)
        toast.showSuccess('Parent unlinked')
        onRelationshipChange?.()
      } catch (error) {
        toast.showError('Failed to unlink parent')
      }
    }
  }

  const handleUnlinkChild = async (childId: string, childTitle: string) => {
    if (confirm(`Are you sure you want to unlink "${childTitle}" from "${node.title}"?`)) {
      try {
        await unlinkNodes(node.id, childId)
        toast.showSuccess('Child unlinked')
        onRelationshipChange?.()
      } catch (error) {
        toast.showError('Failed to unlink child')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Parent */}
      <div key={`parent-${refreshKey}`}>
        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <GitMerge className="w-4 h-4" />
          Parent Node
        </h3>
        {parent ? (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getNodeTypeIcon(parent.type)}</span>
              <div>
                <p className="font-medium">{parent.title}</p>
                <p className="text-sm text-gray-500">{parent.type}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleUnlinkParent}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-500 mb-2">No parent node</p>
            {onCreateParent && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCreateParent(node)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Parent
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      <div key={`children-${refreshKey}`}>
        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Child Nodes ({children.length})
        </h3>
        {children.length > 0 ? (
          <div className="space-y-2">
            {children.map((child) => (
              <div
                key={child.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getNodeTypeIcon(child.type)}</span>
                  <div>
                    <p className="font-medium">{child.title}</p>
                    <p className="text-sm text-gray-500">
                      {child.type}
                      {child.completed && ' • Completed'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnlinkChild(child.id, child.title)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-500 mb-2">No child nodes</p>
          </div>
        )}
        
        {onCreateChild && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCreateChild(node)}
            className="w-full mt-2"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Child
          </Button>
        )}
      </div>

      {/* Statistics */}
      <div className="pt-4 border-t">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Relationship Statistics</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Children:</span>
            <span className="ml-2 font-medium">{children.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Completed Children:</span>
            <span className="ml-2 font-medium">
              {children.filter(c => c.completed).length}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Hierarchy Level:</span>
            <span className="ml-2 font-medium">
              {parent ? 'Child' : 'Root'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Progress:</span>
            <span className="ml-2 font-medium">
              {children.length > 0 
                ? `${Math.round((children.filter(c => c.completed).length / children.length) * 100)}%`
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}