'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Shield, AlertTriangle, AlertCircle } from '@/lib/icons'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

interface ThreatsSectionProps {
  threats: string[]
  onChange: (threats: string[]) => void
}

type ThreatSeverity = 'low' | 'medium' | 'high'

interface ThreatItem {
  text: string
  severity?: ThreatSeverity
  mitigated?: boolean
}

// For now, we'll store threats as strings but display with enhanced UI
// In future, we can migrate to full ThreatItem objects
export function ThreatsSection({ threats, onChange }: ThreatsSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [tempValue, setTempValue] = useState('')
  const [mitigatedItems, setMitigatedItems] = useState<Set<number>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if ((editingIndex !== null || isAddingNew) && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingIndex, isAddingNew])

  const handleAdd = () => {
    setIsAddingNew(true)
    setTempValue('')
  }

  const handleSave = (index?: number) => {
    const trimmedValue = tempValue.trim()
    if (!trimmedValue) return

    if (index !== undefined) {
      // Editing existing item
      const newThreats = [...threats]
      newThreats[index] = trimmedValue
      onChange(newThreats)
      setEditingIndex(null)
    } else {
      // Adding new item
      onChange([...threats, trimmedValue])
      setIsAddingNew(false)
    }
    setTempValue('')
  }

  const handleCancel = () => {
    setEditingIndex(null)
    setIsAddingNew(false)
    setTempValue('')
  }

  const handleRemove = (index: number) => {
    const newThreats = threats.filter((_, i) => i !== index)
    onChange(newThreats)
    // Update mitigated set
    const newMitigated = new Set<number>()
    mitigatedItems.forEach(i => {
      if (i < index) newMitigated.add(i)
      else if (i > index) newMitigated.add(i - 1)
    })
    setMitigatedItems(newMitigated)
  }

  const toggleMitigated = (index: number) => {
    const newMitigated = new Set(mitigatedItems)
    if (newMitigated.has(index)) {
      newMitigated.delete(index)
    } else {
      newMitigated.add(index)
    }
    setMitigatedItems(newMitigated)
  }

  const handleKeyDown = (e: React.KeyboardEvent, index?: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave(index)
      
      // If adding new and there's content, immediately show the add button again
      if (index === undefined && tempValue.trim()) {
        setTimeout(() => {
          setIsAddingNew(true)
          setTempValue('')
        }, 50)
      }
    } else if (e.key === 'Escape') {
      setEditingIndex(null)
      setIsAddingNew(false)
      setTempValue('')
    }
  }

  const handleEditStart = (index: number) => {
    setEditingIndex(index)
    setTempValue(threats[index])
    setIsAddingNew(false)
  }

  // Determine severity based on keywords (simple heuristic)
  const getSeverity = (threat: string): ThreatSeverity => {
    const lowerThreat = threat.toLowerCase()
    if (lowerThreat.includes('critical') || lowerThreat.includes('urgent') || lowerThreat.includes('deadline')) {
      return 'high'
    }
    if (lowerThreat.includes('important') || lowerThreat.includes('concern') || lowerThreat.includes('risk')) {
      return 'medium'
    }
    return 'low'
  }

  const getSeverityIcon = (severity: ThreatSeverity) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      default:
        return <Shield className="w-4 h-4 text-yellow-500" />
    }
  }

  return (
    <div className="space-y-3">
      {/* Existing threat items */}
      {threats.map((threat, index) => {
        const severity = getSeverity(threat)
        const isMitigated = mitigatedItems.has(index)
        
        return (
          <div key={index} className="group">
            {editingIndex === index ? (
              <div className="space-y-2">
                <Input
                  ref={inputRef}
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder="What challenge might you face?"
                  className="w-full"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => handleSave(index)}
                    disabled={!tempValue.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg transition-all",
                isMitigated 
                  ? "bg-green-50 hover:bg-green-100" 
                  : severity === 'high' 
                    ? "bg-red-50 hover:bg-red-100"
                    : severity === 'medium'
                      ? "bg-orange-50 hover:bg-orange-100"
                      : "bg-yellow-50 hover:bg-yellow-100"
              )}>
                <button
                  onClick={() => toggleMitigated(index)}
                  className="flex-shrink-0"
                  title={isMitigated ? "Mark as active threat" : "Mark as mitigated"}
                >
                  {isMitigated ? (
                    <Shield className="w-4 h-4 text-green-600" />
                  ) : (
                    getSeverityIcon(severity)
                  )}
                </button>
                <span 
                  className={cn(
                    "flex-1 cursor-pointer",
                    isMitigated && "line-through text-gray-500"
                  )}
                  onClick={() => !isMitigated && handleEditStart(index)}
                >
                  {threat}
                </span>
                <button
                  onClick={() => handleRemove(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                  aria-label="Remove threat"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Add new threat */}
      {isAddingNew ? (
        <div className="space-y-2">
          <Input
            ref={inputRef}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e)}
            placeholder="What challenge might you face?"
            className="w-full"
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => handleSave()}
              disabled={!tempValue.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="w-full justify-start gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        >
          <Plus className="w-4 h-4" />
          Add threat or obstacle
        </Button>
      )}

      {/* Show hint */}
      {threats.length === 0 && !isAddingNew && (
        <p className="text-sm text-gray-500 italic">
          Identify potential challenges to prepare for them
        </p>
      )}

      {/* Mitigation hint */}
      {threats.length > 0 && (
        <p className="text-xs text-gray-500">
          Click the shield icon to mark threats as mitigated
        </p>
      )}
    </div>
  )
}