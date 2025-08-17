'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Heart, Sword, Shield, Users, Scroll } from '@/lib/icons'
import { useJournalStore } from '@/store/journalStore'
import { 
  GratitudeSection, 
  ThreatsSection, 
  AlliesSection, 
  QuestSection, 
  NotesSection 
} from '@/components/journal'

export default function NewJournalEntryClient({ userId }: { userId: string }) {
  const router = useRouter()
  const { addEntry } = useJournalStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    gratitude: [] as string[],
    quests: [] as string[],
    threats: [] as string[],
    allies: [] as string[],
    notes: '',
  })

  const handleGratitudeChange = (gratitude: string[]) => {
    setFormData({ ...formData, gratitude })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await addEntry({
        ...formData,
        userId,
        date: new Date().toISOString(),
      })
      
      router.push('/journal')
    } catch (error) {
      // Failed to create entry
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">New Journal Entry</h1>
          <Link href="/journal">
            <Button variant="secondary" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Journal
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                onChange={(quests) => setFormData({ ...formData, quests })}
              />
            </CardContent>
          </Card>

          {/* Threats & Obstacles */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-500" />
                <CardTitle>Threats & Obstacles</CardTitle>
              </div>
              <CardDescription>What challenges might you face today?</CardDescription>
            </CardHeader>
            <CardContent>
              <ThreatsSection
                threats={formData.threats}
                onChange={(threats) => setFormData({ ...formData, threats })}
              />
            </CardContent>
          </Card>

          {/* Allies & Resources */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <CardTitle>Allies & Resources</CardTitle>
              </div>
              <CardDescription>Who or what can help you succeed?</CardDescription>
            </CardHeader>
            <CardContent>
              <AlliesSection
                allies={formData.allies}
                onChange={(allies) => setFormData({ ...formData, allies })}
              />
            </CardContent>
          </Card>

          {/* Additional Notes */}
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
                onChange={(notes) => setFormData({ ...formData, notes })}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href="/journal">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting || formData.quests.length === 0}>
              {isSubmitting ? 'Creating Entry...' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}