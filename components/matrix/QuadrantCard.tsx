'use client'

import { memo, ReactNode } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus } from '@/lib/icons'
import { LOAD_MORE_INCREMENT } from './utils'

interface QuadrantConfig {
  id: string
  title: string
  description: string
  icon: ReactNode
  color: string
  bgColor: string
}

interface QuadrantCardProps {
  quadrant: QuadrantConfig
  totalNodes: number
  visibleCount: number
  remainingCount: number
  isCollapsed?: boolean
  onAddClick: () => void
  onLoadMore: () => void
  children: ReactNode
}

export const QuadrantCard = memo(function QuadrantCard({
  quadrant,
  totalNodes,
  visibleCount,
  remainingCount,
  onAddClick,
  onLoadMore,
  children
}: QuadrantCardProps) {
  return (
    <Droppable droppableId={quadrant.id}>
      {(provided, snapshot) => (
        <Card
          className={`h-full min-h-[300px] transition-all ${
            snapshot.isDraggingOver ? 'ring-2 ring-brain-500 shadow-lg' : ''
          }`}
        >
          <CardHeader className={quadrant.bgColor}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={quadrant.color}>{quadrant.icon}</div>
                <div>
                  <CardTitle className={quadrant.color}>
                    {quadrant.title}
                    {totalNodes > 0 && (
                      <span className="ml-2 text-sm font-normal">({totalNodes})</span>
                    )}
                  </CardTitle>
                  <CardDescription>{quadrant.description}</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddClick}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="p-4 space-y-2"
          >
            {children}
            {provided.placeholder}
            
            {/* Show More button */}
            {remainingCount > 0 && (
              <div className="mt-3 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  className="w-full"
                >
                  Show {Math.min(remainingCount, LOAD_MORE_INCREMENT)} more
                  {remainingCount > LOAD_MORE_INCREMENT && ` (${remainingCount} total)`}
                </Button>
              </div>
            )}
            
            {totalNodes === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No tasks yet</p>
                <p className="text-xs mt-1">Drop tasks here or click + to add</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </Droppable>
  )
})