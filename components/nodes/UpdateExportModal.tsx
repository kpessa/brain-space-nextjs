'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useNodesStore } from '@/store/nodes'
import { useUserPreferencesStore, shouldShowNode, type UserMode } from '@/store/userPreferencesStore'
import type { Node, NodeUpdate } from '@/types/node'
import { Download, FileText, Calendar, Filter, Copy, Check, Briefcase, Home, Globe } from '@/lib/icons'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'

dayjs.extend(isBetween)

interface UpdateExportModalProps {
  isOpen: boolean
  onClose: () => void
}

type TimeFrame = '2weeks' | '1month' | '3months' | 'custom'

export function UpdateExportModal({ isOpen, onClose }: UpdateExportModalProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('2weeks')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [includeCompleted, setIncludeCompleted] = useState(true)
  const [onlyWithUpdates, setOnlyWithUpdates] = useState(true)
  const [copied, setCopied] = useState(false)
  
  const { nodes } = useNodesStore()
  const { currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode } = useUserPreferencesStore()
  
  // Allow overriding the current mode for export
  const [exportMode, setExportMode] = useState<UserMode | null>(null)
  const effectiveMode = exportMode || currentMode
  
  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date = dayjs(now).endOf('day').toDate()
    
    switch (timeFrame) {
      case '2weeks':
        start = dayjs(now).subtract(14, 'day').startOf('day').toDate()
        break
      case '1month':
        start = dayjs(now).subtract(1, 'month').startOf('day').toDate()
        break
      case '3months':
        start = dayjs(now).subtract(3, 'month').startOf('day').toDate()
        break
      case 'custom':
        start = customStartDate ? dayjs(customStartDate).startOf('day').toDate() : dayjs(now).subtract(14, 'day').startOf('day').toDate()
        end = customEndDate ? dayjs(customEndDate).endOf('day').toDate() : end
        break
      default:
        start = dayjs(now).subtract(14, 'day').startOf('day').toDate()
    }
    
    return { start, end }
  }, [timeFrame, customStartDate, customEndDate])
  
  // Filter nodes based on criteria
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      // Filter by mode (work/personal/all)
      if (!shouldShowNode(node.tags, node.isPersonal, effectiveMode, hidePersonalInWorkMode, hideWorkInPersonalMode)) {
        return false
      }
      
      // Filter by completion status
      if (!includeCompleted && node.completed) return false
      
      // Filter by updates in date range
      if (onlyWithUpdates) {
        const hasUpdatesInRange = node.updates?.some(update => {
          const updateDate = dayjs(update.timestamp)
          return updateDate.isBetween(dayjs(dateRange.start), dayjs(dateRange.end), null, '[]')
        })
        if (!hasUpdatesInRange) return false
      }
      
      return true
    })
  }, [nodes, effectiveMode, includeCompleted, onlyWithUpdates, dateRange, hidePersonalInWorkMode, hideWorkInPersonalMode])
  
  // Generate markdown report
  const generateMarkdown = () => {
    const reportDate = dayjs().format('MMMM D, YYYY')
    const startDate = dayjs(dateRange.start).format('MMMM D, YYYY')
    const endDate = dayjs(dateRange.end).format('MMMM D, YYYY')
    
    let markdown = `# Progress Report\n\n`
    markdown += `**Period**: ${startDate} - ${endDate}\n`
    markdown += `**Generated**: ${reportDate}\n\n`
    
    // Executive Summary
    markdown += `## Executive Summary\n\n`
    const totalUpdates = filteredNodes.reduce((sum, node) => {
      return sum + (node.updates?.filter(u => 
        dayjs(u.timestamp).isBetween(dayjs(dateRange.start), dayjs(dateRange.end), null, '[]')
      ).length || 0)
    }, 0)
    const completedCount = filteredNodes.filter(n => n.completed).length
    markdown += `- Total nodes with updates: ${filteredNodes.length}\n`
    markdown += `- Total updates logged: ${totalUpdates}\n`
    markdown += `- Completed items: ${completedCount}\n\n`
    
    // Group nodes by type
    const nodesByType = filteredNodes.reduce((acc, node) => {
      const type = node.type || 'other'
      if (!acc[type]) acc[type] = []
      acc[type].push(node)
      return acc
    }, {} as Record<string, Node[]>)
    
    // Updates by type
    Object.entries(nodesByType).forEach(([type, typeNodes]) => {
      markdown += `## ${type.charAt(0).toUpperCase() + type.slice(1)}s\n\n`
      
      typeNodes.forEach(node => {
        // Node header
        markdown += `### ${node.title || 'Untitled'}\n`
        markdown += `*Priority: ${getPriorityLabel(node.urgency, node.importance)}*`
        if (node.completed) markdown += ` ✓ **Completed**`
        markdown += `\n\n`
        
        // Node description if available
        if (node.description) {
          markdown += `${node.description}\n\n`
        }
        
        // Updates in date range
        const relevantUpdates = node.updates?.filter(update => 
          dayjs(update.timestamp).isBetween(dayjs(dateRange.start), dayjs(dateRange.end), null, '[]')
        ).sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf())
        
        if (relevantUpdates && relevantUpdates.length > 0) {
          markdown += `#### Updates:\n`
          relevantUpdates.forEach(update => {
            const updateDate = dayjs(update.timestamp).format('MMM D')
            const updateType = update.type ? `[${update.type}]` : ''
            markdown += `- **${updateDate}** ${updateType}: ${update.content}\n`
          })
          markdown += `\n`
        }
        
        markdown += `---\n\n`
      })
    })
    
    // Upcoming focus (high priority incomplete items)
    const upcomingItems = filteredNodes
      .filter(n => !n.completed && ((n.urgency || 5) + (n.importance || 5)) >= 14)
      .slice(0, 5)
    
    if (upcomingItems.length > 0) {
      markdown += `## Upcoming Focus\n\n`
      upcomingItems.forEach(node => {
        markdown += `- **${node.title || 'Untitled'}** (${node.type})\n`
      })
    }
    
    return markdown
  }
  
  const getPriorityLabel = (urgency?: number, importance?: number) => {
    const total = (urgency || 5) + (importance || 5)
    if (total >= 16) return 'Critical'
    if (total >= 14) return 'High'
    if (total >= 10) return 'Medium'
    return 'Low'
  }
  
  const handleExport = () => {
    const markdown = generateMarkdown()
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `progress-report-${dayjs().format('YYYY-MM-DD')}.md`
    link.click()
    URL.revokeObjectURL(url)
  }
  
  const handleCopyToClipboard = async () => {
    const markdown = generateMarkdown()
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const getModeIcon = (mode: UserMode) => {
    switch (mode) {
      case 'work': return <Briefcase className="w-4 h-4" />
      case 'personal': return <Home className="w-4 h-4" />
      case 'all': return <Globe className="w-4 h-4" />
    }
  }
  
  const getModeLabel = (mode: UserMode) => {
    switch (mode) {
      case 'work': return 'Work'
      case 'personal': return 'Personal'
      case 'all': return 'All'
    }
  }
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Export Updates Report"
      size="lg"
    >
      <div className="space-y-6">
        {/* Time Frame Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Calendar className="w-4 h-4 inline mr-1" />
            Time Frame
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setTimeFrame('2weeks')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timeFrame === '2weeks'
                  ? 'bg-brain-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 2 Weeks
            </button>
            <button
              onClick={() => setTimeFrame('1month')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timeFrame === '1month'
                  ? 'bg-brain-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setTimeFrame('3months')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timeFrame === '3months'
                  ? 'bg-brain-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 3 Months
            </button>
            <button
              onClick={() => setTimeFrame('custom')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timeFrame === 'custom'
                  ? 'bg-brain-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom Range
            </button>
          </div>
          
          {timeFrame === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Export Mode
          </label>
          <div className="mb-2">
            <p className="text-xs text-gray-600 mb-2">
              Currently in {getModeLabel(currentMode)} mode. Choose what to export:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setExportMode('work')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  effectiveMode === 'work'
                    ? 'bg-brain-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Work
              </button>
              <button
                onClick={() => setExportMode('personal')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  effectiveMode === 'personal'
                    ? 'bg-brain-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Home className="w-4 h-4" />
                Personal
              </button>
              <button
                onClick={() => setExportMode('all')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  effectiveMode === 'all'
                    ? 'bg-brain-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                All
              </button>
            </div>
          </div>
        </div>
        
        {/* Additional Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Filter className="w-4 h-4 inline mr-1" />
            Additional Filters
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeCompleted}
                onChange={(e) => setIncludeCompleted(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Include completed items</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={onlyWithUpdates}
                onChange={(e) => setOnlyWithUpdates(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Only show nodes with updates in time frame</span>
            </label>
          </div>
        </div>
        
        {/* Preview Stats */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Report Preview</p>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Date range: {dayjs(dateRange.start).format('MMM D')} - {dayjs(dateRange.end).format('MMM D, YYYY')}</p>
            <p>• Nodes to export: {filteredNodes.length}</p>
            <p className="flex items-center gap-1">
              • Export mode: {getModeIcon(effectiveMode)} {getModeLabel(effectiveMode)} nodes
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleCopyToClipboard}
            className="flex-1 flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Markdown
          </Button>
        </div>
      </div>
    </Modal>
  )
}