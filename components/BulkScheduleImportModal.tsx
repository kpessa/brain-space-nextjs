'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Calendar, Upload, Loader2, CheckCircle, AlertCircle, Info } from '@/lib/icons'
import { useNodesStore } from '@/store/nodeStore'
import { googleCalendarService } from '@/services/googleCalendar'
import { useCalendarStore } from '@/store/calendarStore'
import { format, parse, isValid } from 'date-fns'
import type { Node } from '@/types/node'

interface BulkScheduleImportModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

interface ParsedEvent {
  title: string
  date: Date
  time?: string
  location?: string
  isValid: boolean
  error?: string
}

export function BulkScheduleImportModal({ 
  isOpen, 
  onClose, 
  userId 
}: BulkScheduleImportModalProps) {
  const [inputText, setInputText] = useState('')
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([])
  const [createNodes, setCreateNodes] = useState(true)
  const [createCalendarEvents, setCreateCalendarEvents] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<{ nodes: number; events: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [defaultTags, setDefaultTags] = useState('soccer, inter-miami')
  
  const { createNode } = useNodesStore()
  const { selectedCalendars, isAuthenticated } = useCalendarStore()
  
  const parseScheduleText = () => {
    const lines = inputText.trim().split('\n').filter(line => line.trim())
    const events: ParsedEvent[] = []
    
    lines.forEach(line => {
      // Try to parse different formats
      // Format 1: "Inter Miami vs Orlando City - March 2, 2024 - 7:30 PM - DRV PNK Stadium"
      // Format 2: "March 2, 7:30 PM - Inter Miami vs Orlando City @ DRV PNK Stadium"
      // Format 3: "3/2 7:30pm Inter Miami vs Orlando City"
      
      let parsed: ParsedEvent | null = null
      
      // Try format with dash separators
      const dashMatch = line.match(/(.+?)\s*-\s*(.+?)\s*-\s*(.+?)(?:\s*-\s*(.+))?$/)
      if (dashMatch) {
        const [_, titlePart, datePart, timePart, locationPart] = dashMatch
        try {
          // Try parsing date
          let date = parse(datePart.trim(), 'MMMM d, yyyy', new Date())
          if (!isValid(date)) {
            date = parse(datePart.trim(), 'MMM d, yyyy', new Date())
          }
          
          if (isValid(date)) {
            parsed = {
              title: titlePart.trim(),
              date,
              time: timePart?.trim(),
              location: locationPart?.trim(),
              isValid: true
            }
          }
        } catch (e) {
          // Continue to try other formats
        }
      }
      
      // Try simple format with date at beginning
      if (!parsed) {
        const simpleMatch = line.match(/^(\d{1,2}\/\d{1,2})\s+(\d{1,2}:\d{2}\s*[ap]m)\s+(.+?)(?:\s*@\s*(.+))?$/i)
        if (simpleMatch) {
          const [_, datePart, timePart, titlePart, locationPart] = simpleMatch
          try {
            const currentYear = new Date().getFullYear()
            const date = parse(`${datePart}/${currentYear}`, 'M/d/yyyy', new Date())
            
            if (isValid(date)) {
              parsed = {
                title: titlePart.trim(),
                date,
                time: timePart.trim(),
                location: locationPart?.trim(),
                isValid: true
              }
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      // If no format matched, mark as invalid
      if (!parsed) {
        parsed = {
          title: line,
          date: new Date(),
          isValid: false,
          error: 'Could not parse date/time from this line'
        }
      }
      
      events.push(parsed)
    })
    
    setParsedEvents(events)
  }
  
  const handleImport = async () => {
    if (parsedEvents.length === 0) return
    
    setIsProcessing(true)
    setError(null)
    setResults(null)
    
    let nodeCount = 0
    let eventCount = 0
    
    try {
      const validEvents = parsedEvents.filter(e => e.isValid)
      const tags = defaultTags.split(',').map(t => t.trim()).filter(t => t)
      
      for (const event of validEvents) {
        // Create node if requested
        if (createNodes) {
          const nodeData: Partial<Node> = {
            title: event.title,
            type: 'task',
            tags: tags,
            userId: userId,
            urgency: 5,
            importance: 7,
            dueDate: {
              type: 'exact',
              date: event.date.toISOString()
            }
          }
          
          if (event.location) {
            nodeData.description = `Location: ${event.location}`
          }
          
          const nodeId = await createNode(nodeData)
          if (nodeId) {
            nodeCount++
            
            // Create calendar event linked to node if requested
            if (createCalendarEvents && isAuthenticated) {
              try {
                let eventDateTime = event.date
                if (event.time) {
                  // Parse time and combine with date
                  const timeMatch = event.time.match(/(\d{1,2}):(\d{2})\s*([ap]m)?/i)
                  if (timeMatch) {
                    const [_, hours, minutes, ampm] = timeMatch
                    let hour = parseInt(hours)
                    if (ampm?.toLowerCase() === 'pm' && hour !== 12) hour += 12
                    if (ampm?.toLowerCase() === 'am' && hour === 12) hour = 0
                    
                    eventDateTime = new Date(event.date)
                    eventDateTime.setHours(hour, parseInt(minutes), 0, 0)
                  }
                }
                
                const endDateTime = new Date(eventDateTime)
                endDateTime.setHours(endDateTime.getHours() + 2) // 2 hour event
                
                await googleCalendarService.createEvent({
                  summary: event.title,
                  description: `${event.location ? `Location: ${event.location}\n\n` : ''}Linked to Brain Space node`,
                  start: {
                    dateTime: eventDateTime.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  },
                  end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  },
                  location: event.location,
                }, selectedCalendars[0] || 'primary')
                
                eventCount++
              } catch (e) {
                console.error('Failed to create calendar event:', e)
              }
            }
          }
        } else if (createCalendarEvents && isAuthenticated) {
          // Just create calendar event without node
          try {
            let eventDateTime = event.date
            if (event.time) {
              const timeMatch = event.time.match(/(\d{1,2}):(\d{2})\s*([ap]m)?/i)
              if (timeMatch) {
                const [_, hours, minutes, ampm] = timeMatch
                let hour = parseInt(hours)
                if (ampm?.toLowerCase() === 'pm' && hour !== 12) hour += 12
                if (ampm?.toLowerCase() === 'am' && hour === 12) hour = 0
                
                eventDateTime = new Date(event.date)
                eventDateTime.setHours(hour, parseInt(minutes), 0, 0)
              }
            }
            
            const endDateTime = new Date(eventDateTime)
            endDateTime.setHours(endDateTime.getHours() + 2)
            
            await googleCalendarService.createEvent({
              summary: event.title,
              description: event.location ? `Location: ${event.location}` : undefined,
              start: {
                dateTime: eventDateTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              end: {
                dateTime: endDateTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              location: event.location,
            }, selectedCalendars[0] || 'primary')
            
            eventCount++
          } catch (e) {
            console.error('Failed to create calendar event:', e)
          }
        }
      }
      
      setResults({ nodes: nodeCount, events: eventCount })
    } catch (error) {
      console.error('Bulk import failed:', error)
      setError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsProcessing(false)
    }
  }
  
  const exampleText = `Inter Miami vs Orlando City - March 2, 2024 - 7:30 PM - DRV PNK Stadium
Inter Miami vs DC United - March 9, 2024 - 8:00 PM - Chase Stadium
LAFC vs Inter Miami - March 16, 2024 - 10:30 PM - BMO Stadium`
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-brain-600" />
          Bulk Schedule Import
        </div>
      }
      size="lg"
    >
      <div className="space-y-4">
        {!results ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste Schedule Data
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Paste your schedule data here. Example:\n${exampleText}`}
                className="w-full h-48 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-brain-500 focus:border-transparent font-mono text-sm"
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Supported formats:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Title - Date - Time - Location</li>
                    <li>M/D Time Title @ Location</li>
                    <li>Various date formats supported</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Tags (comma-separated)
              </label>
              <input
                type="text"
                value={defaultTags}
                onChange={(e) => setDefaultTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                placeholder="soccer, inter-miami, sports"
              />
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createNodes}
                  onChange={(e) => setCreateNodes(e.target.checked)}
                  className="rounded border-gray-300 text-brain-600 focus:ring-brain-500"
                />
                <span className="text-sm font-medium">Create Brain Space nodes</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createCalendarEvents}
                  onChange={(e) => setCreateCalendarEvents(e.target.checked)}
                  className="rounded border-gray-300 text-brain-600 focus:ring-brain-500"
                  disabled={!isAuthenticated}
                />
                <span className="text-sm font-medium">
                  Create Google Calendar events
                  {!isAuthenticated && <span className="text-gray-500"> (requires authentication)</span>}
                </span>
              </label>
            </div>
            
            {parsedEvents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview ({parsedEvents.filter(e => e.isValid).length} valid events)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {parsedEvents.map((event, index) => (
                      <div 
                        key={index} 
                        className={`text-sm p-2 rounded ${
                          event.isValid 
                            ? 'bg-green-50 text-green-800' 
                            : 'bg-red-50 text-red-800'
                        }`}
                      >
                        {event.isValid ? (
                          <>
                            <div className="font-medium">{event.title}</div>
                            <div className="text-xs">
                              {format(event.date, 'MMM d, yyyy')}
                              {event.time && ` at ${event.time}`}
                              {event.location && ` - ${event.location}`}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium">{event.title}</div>
                            <div className="text-xs">{event.error}</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={parseScheduleText}
                disabled={!inputText.trim() || isProcessing}
                className="flex-1"
              >
                Parse & Preview
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={parsedEvents.filter(e => e.isValid).length === 0 || isProcessing || (!createNodes && !createCalendarEvents)}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Events
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          // Success view
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Import Successful!</h3>
            <p className="text-gray-600 mb-6">
              Created {results.nodes} nodes and {results.events} calendar events
            </p>
            <Button onClick={onClose} className="mx-auto">
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}