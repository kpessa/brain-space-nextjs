'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Plus, Calendar, Shield, Edit2, Eye } from '@/lib/icons'
import { useJournalStore } from '@/store/journalStore'
import { XPBar } from '@/components/journal/XPBar'
import { LevelDisplay } from '@/components/journal/LevelDisplay'
import { StreakCounter } from '@/components/journal/StreakCounter'
import { JournalEntryModal } from '@/components/journal/JournalEntryModal'
import { LEVELS, JournalEntry } from '@/types/journal'

export default function JournalClient({ userId }: { userId: string }) {
  const { entries, userProgress, getTodayEntry, loadEntriesFromFirestore, loadUserProgressFromFirestore, isLoading } = useJournalStore()
  const todayEntry = getTodayEntry()
  const currentLevel = LEVELS.find(l => l.level === userProgress.level) || LEVELS[0]
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  useEffect(() => {
    // Load data from Firestore
    loadEntriesFromFirestore(userId)
    loadUserProgressFromFirestore(userId)
  }, [userId, loadEntriesFromFirestore, loadUserProgressFromFirestore])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brain-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading journal...</p>
        </div>
      </div>
    )
  }
  
  return (
      <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 min-h-[calc(var(--vh,1vh)*100-4rem)]">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-white">Quest Journal</h1>
            <Link href="/journal/new">
              <Button variant="primary" className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                New Entry
              </Button>
            </Link>
          </div>
          <p className="text-white/80">Your chronicles of adventure, growth, and discovery</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-brain-500" />
                    <CardTitle>Today&apos;s Quest</CardTitle>
                  </div>
                  <span className="text-sm text-gray-500">
                    {todayEntry ? 'Completed' : 'Not yet started'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {todayEntry ? (
                  <div className="space-y-2">
                    <p className="font-semibold">Today&apos;s Quest:</p>
                    <p className="text-gray-600">{todayEntry.dailyQuest}</p>
                    <p className="text-sm text-brain-600">+{todayEntry.xpEarned} XP earned</p>
                    <div className="flex gap-2 mt-4">
                      <Link href={`/journal/entry/${todayEntry.id}`}>
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/journal/edit/${todayEntry.id}`}>
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No entry for today yet. Start your quest!</p>
                    <Link href="/journal/new">
                      <Button variant="primary">Create Today&apos;s Entry</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Entries */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Entries</CardTitle>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <div className="text-gray-500 text-center py-8" data-testid="journal-empty-state">
                    <p>No entries yet. Start your journey!</p>
                    <Link href="/journal/new">
                      <Button variant="primary" className="mt-4" data-testid="create-journal-entry-cta">
                        Create Your First Entry
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entries.slice(0, 5).map(entry => {
                      // Create summary from available data
                      const gratitudeCount = Array.isArray(entry.gratitude) ? entry.gratitude.length : 0
                      const questsText = Array.isArray(entry.quests) 
                        ? entry.quests.slice(0, 2).join(', ')
                        : entry.dailyQuest || 'No quests recorded'
                      const notesPreview = entry.notes 
                        ? entry.notes.substring(0, 100) + (entry.notes.length > 100 ? '...' : '')
                        : ''
                      
                      // Calculate word count estimate
                      const wordCount = [
                        entry.notes || '',
                        ...(Array.isArray(entry.gratitude) ? entry.gratitude : []),
                        ...(Array.isArray(entry.quests) ? entry.quests : []),
                        ...(Array.isArray(entry.allies) ? entry.allies : [entry.allies || '']),
                        ...(Array.isArray(entry.threats) ? entry.threats : [entry.threats || ''])
                      ].join(' ').split(/\s+/).filter(word => word.length > 0).length
                      
                      return (
                        <div 
                          key={entry.id} 
                          className="group p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                          data-testid="journal-entry"
                          onClick={() => {
                            setSelectedEntry(entry)
                            setIsModalOpen(true)
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              {/* Date and XP */}
                              <div className="flex items-center gap-3">
                                <p className="font-medium" data-testid="journal-entry-date">
                                  {new Date(entry.date).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </p>
                                <span className="text-sm text-brain-600 font-medium" data-testid="journal-entry-xp">
                                  +{entry.xpEarned} XP
                                </span>
                                {wordCount > 0 && (
                                  <span className="text-xs text-gray-500" data-testid="journal-entry-word-count">
                                    {wordCount} words
                                  </span>
                                )}
                              </div>
                              
                              {/* Summary/Excerpt */}
                              <div className="text-sm text-gray-600" data-testid="journal-entry-summary">
                                {notesPreview || questsText}
                              </div>
                              
                              {/* Tags/Metadata */}
                              <div className="flex flex-wrap gap-2" data-testid="journal-entry-tags">
                                {gratitudeCount > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 tag">
                                    🙏 {gratitudeCount} gratitude{gratitudeCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {Array.isArray(entry.quests) && entry.quests.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 tag">
                                    ⚔️ {entry.quests.length} quest{entry.quests.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {(Array.isArray(entry.allies) ? entry.allies.length > 0 : entry.allies) && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 tag">
                                    🤝 Allies
                                  </span>
                                )}
                                {(Array.isArray(entry.threats) ? entry.threats.length > 0 : entry.threats) && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 tag">
                                    ⚠️ Threats
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex gap-1">
                              <Link href={`/journal/entry/${entry.id}`}>
                                <Button size="sm" variant="ghost" title="View full entry">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Link href={`/journal/edit/${entry.id}`}>
                                <Button size="sm" variant="ghost" title="Edit entry">
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                          
                          {/* Expandable preview on hover */}
                          <div 
                            className="hidden group-hover:block mt-3 p-3 bg-gray-50 rounded text-sm text-gray-600"
                            data-testid="journal-entry-expanded"
                          >
                            {entry.notes && (
                              <p className="line-clamp-3">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Progress Sidebar */}
          <div className="space-y-4">
            {/* Level Progress Card */}
            <Card className="hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <LevelDisplay level={userProgress.level} />
                <XPBar
                  currentXP={userProgress.currentXP}
                  maxXP={currentLevel.maxXP === Infinity ? 1000 : currentLevel.maxXP}
                  level={userProgress.level}
                />
                <div className="text-sm text-gray-600">
                  <p>Total XP: {userProgress.totalXP}</p>
                  <p>Total Entries: {userProgress.totalEntries}</p>
                </div>
              </CardContent>
            </Card>

            {/* Streak Card */}
            <Card className="hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <CardTitle>Current Streak</CardTitle>
              </CardHeader>
              <CardContent>
                <StreakCounter
                  currentStreak={userProgress.currentStreak}
                  longestStreak={userProgress.longestStreak}
                  size="lg"
                />
              </CardContent>
            </Card>

            {/* Level Perks */}
            <Card>
              <CardHeader>
                <CardTitle>Level Perks</CardTitle>
                <CardDescription>Unlocked abilities</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentLevel.perks.map((perk, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-brain-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{perk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Journal Entry Modal */}
        <JournalEntryModal 
          entry={selectedEntry}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedEntry(null)
          }}
        />
      </div>
      </div>
  )
}