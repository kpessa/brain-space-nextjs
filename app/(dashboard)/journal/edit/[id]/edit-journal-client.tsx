'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Heart, Sword, Shield, Users, Scroll, Trash2 } from '@/lib/icons'
import { useJournalStore } from '@/store/journalStore'
import { 
  GratitudeSection, 
  ThreatsSection, 
  AlliesSection, 
  QuestSection, 
  NotesSection 
} from '@/components/journal'
import { migrateToArray } from '@/types/journal'

export default function EditJournalEntryClient() {
  const params = useParams()
  const router = useRouter()
  const { entries, updateEntry, deleteEntry } = useJournalStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const entry = entries.find(e => e.id === params.id)

  const [formData, setFormData] = useState({
    gratitude: [] as string[],
    quests: [] as string[],
    threats: [] as string[],
    allies: [] as string[],
    notes: '',
  })

  useEffect(() => {
    if (entry) {
      const { migrateQuestsToArray } = require('@/types/journal')
      setFormData({
        gratitude: entry.gratitude || [],
        quests: migrateQuestsToArray(entry),
        threats: migrateToArray(entry.threats),
        allies: migrateToArray(entry.allies),
        notes: entry.notes || '',
      })
    }
  }, [entry])

  if (!entry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-gray-600 mb-4">Entry not found</p>
            <Link href="/journal">
              <Button variant="primary">Back to Journal</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleGratitudeChange = (gratitude: string[]) => {
    setFormData(prev => ({ ...prev, gratitude }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    try {
      await updateEntry(entry.id, formData)
      router.push(`/journal/entry/${entry.id}`)
    } catch (error) {
      // Failed to update journal entry
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteEntry(entry.id)
      router.push('/journal')
    } catch (error) {
      // Failed to delete journal entry
    }
  }

  const entryDate = new Date(entry.date)

  return (
    <div className="min-h-screen bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 p-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <Link href={`/journal/entry/${entry.id}`}>
            <Button variant="ghost" className="mb-4 text-white hover:text-white/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Entry
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-white">Edit Journal Entry</h1>
          <p className="text-white/80 mt-2">Editing entry from {entryDate.toLocaleDateString()}</p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Gratitude Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <CardTitle>Gratitude</CardTitle>
                </div>
                <CardDescription>What are you grateful for today?</CardDescription>
              </CardHeader>
              <CardContent>
                <GratitudeSection
                  gratitude={formData.gratitude}
                  onChange={handleGratitudeChange}
                />
              </CardContent>
            </Card>

            {/* Quests */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sword className="w-5 h-5 text-blue-500" />
                  <CardTitle>Quests</CardTitle>
                </div>
                <CardDescription>What are your objectives for today?</CardDescription>
              </CardHeader>
              <CardContent>
                <QuestSection
                  quests={formData.quests}
                  onChange={(quests) => setFormData(prev => ({ ...prev, quests }))}
                />
              </CardContent>
            </Card>

            {/* Threats */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-500" />
                  <CardTitle>Threats & Obstacles</CardTitle>
                </div>
                <CardDescription>What challenges or obstacles do you face?</CardDescription>
              </CardHeader>
              <CardContent>
                <ThreatsSection
                  threats={formData.threats}
                  onChange={(threats) => setFormData(prev => ({ ...prev, threats }))}
                />
              </CardContent>
            </Card>

            {/* Allies */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-500" />
                  <CardTitle>Allies & Resources</CardTitle>
                </div>
                <CardDescription>Who or what supports you on your journey?</CardDescription>
              </CardHeader>
              <CardContent>
                <AlliesSection
                  allies={formData.allies}
                  onChange={(allies) => setFormData(prev => ({ ...prev, allies }))}
                />
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Scroll className="w-5 h-5 text-purple-500" />
                  <CardTitle>Adventure Notes</CardTitle>
                </div>
                <CardDescription>Any other thoughts or reflections?</CardDescription>
              </CardHeader>
              <CardContent>
                <NotesSection
                  notes={formData.notes}
                  onChange={(notes) => setFormData(prev => ({ ...prev, notes }))}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Entry
              </Button>
              <div className="flex gap-4">
                <Link href={`/journal/entry/${entry.id}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Delete Entry?</CardTitle>
                <CardDescription>
                  This action cannot be undone. The entry and all associated XP will be permanently removed.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                >
                  Delete Entry
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}