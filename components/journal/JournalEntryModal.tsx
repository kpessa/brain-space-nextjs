'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { JournalEntry } from '@/types/journal'
import { Calendar, Shield, Users, Sword, Heart, Brain } from '@/lib/icons'

interface JournalEntryModalProps {
  entry: JournalEntry | null
  isOpen: boolean
  onClose: () => void
}

export function JournalEntryModal({ entry, isOpen, onClose }: JournalEntryModalProps) {
  if (!entry) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="journal-entry-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {new Date(entry.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6" data-testid="journal-entry-full-content">
          {/* Gratitude Section */}
          {Array.isArray(entry.gratitude) && entry.gratitude.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-green-700 mb-2">
                <Heart className="w-4 h-4" />
                Gratitude
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {entry.gratitude.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Quests Section */}
          {(Array.isArray(entry.quests) && entry.quests.length > 0) || entry.dailyQuest && (
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-blue-700 mb-2">
                <Sword className="w-4 h-4" />
                Quests
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {Array.isArray(entry.quests) 
                  ? entry.quests.map((quest, index) => (
                      <li key={index}>{quest}</li>
                    ))
                  : entry.dailyQuest && <li>{entry.dailyQuest}</li>
                }
              </ul>
            </div>
          )}

          {/* Notes Section */}
          {entry.notes && (
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                <Brain className="w-4 h-4" />
                Reflections
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}

          {/* Allies Section */}
          {((Array.isArray(entry.allies) && entry.allies.length > 0) || 
            (typeof entry.allies === 'string' && entry.allies)) && (
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-purple-700 mb-2">
                <Users className="w-4 h-4" />
                Allies
              </h3>
              {Array.isArray(entry.allies) ? (
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {entry.allies.map((ally, index) => (
                    <li key={index}>{ally}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-700">{entry.allies}</p>
              )}
            </div>
          )}

          {/* Threats Section */}
          {((Array.isArray(entry.threats) && entry.threats.length > 0) || 
            (typeof entry.threats === 'string' && entry.threats)) && (
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-red-700 mb-2">
                <Shield className="w-4 h-4" />
                Challenges
              </h3>
              {Array.isArray(entry.threats) ? (
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {entry.threats.map((threat, index) => (
                    <li key={index}>{threat}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-700">{entry.threats}</p>
              )}
            </div>
          )}

          {/* XP Earned */}
          <div className="pt-4 border-t">
            <p className="text-center text-lg font-semibold text-brain-600">
              +{entry.xpEarned} XP Earned
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}