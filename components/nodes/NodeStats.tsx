'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Network, CheckCircle, Target, Tag } from '@/lib/icons'
import type { Node } from '@/types/node'

interface NodeStatsProps {
  nodes: Node[]
  filteredNodes: Node[]
  allTags: string[]
  currentMode: 'work' | 'personal' | 'all'
  showCompleted: boolean
}

export function NodeStats({ nodes, filteredNodes, allTags, currentMode, showCompleted }: NodeStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-brain-100 rounded-lg flex items-center justify-center">
              <Network className="w-4 h-4 text-brain-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Nodes</p>
              <p className="text-2xl font-bold text-gray-900">{filteredNodes.length}</p>
              {currentMode !== 'all' && (
                <p className="text-xs text-gray-500">{currentMode} mode</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {nodes.filter(n => n.completed).length}
              </p>
              {!showCompleted && nodes.filter(n => n.completed).length > 0 && (
                <p className="text-xs text-gray-500">Hidden</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tasks</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredNodes.filter(n => n.type === 'task').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Tag className="w-4 h-4 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tags</p>
              <p className="text-2xl font-bold text-gray-900">{allTags.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}