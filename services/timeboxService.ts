import { TimeboxTask, TimeSlot } from '@/store/timeboxStore'

// Helper to get Firebase dynamically
async function getFirebase() {
  const { db } = await import('@/lib/firebase')
  const firestore = await import('firebase/firestore')
  return { db, ...firestore }
}

interface TimeboxData {
  userId: string
  date: string
  slots: Record<string, TimeboxTask[]>
  intervalMinutes?: 30 | 60 | 120
  createdAt?: any
  updatedAt?: any
}

export class TimeboxService {
  /**
   * Load timebox data from Firestore
   */
  static async loadTimeboxData(
    userId: string, 
    date: string
  ): Promise<{ slots: Record<string, TimeboxTask[]>; intervalMinutes?: number } | null> {
    if (!userId) {
      return null
    }

    try {
      const { db, collection, query, where, getDocs } = await getFirebase()
      
      const timeboxQuery = query(
        collection(db, 'users', userId, 'timeboxes'),
        where('date', '==', date)
      )
      
      const timeboxDoc = await getDocs(timeboxQuery)
      if (!timeboxDoc.empty) {
        const data = timeboxDoc.docs[0].data() as TimeboxData
        
        return {
          slots: data.slots || {},
          intervalMinutes: data.intervalMinutes
        }
      } else {
        return null
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Save timebox data to Firestore
   */
  static async saveTimeboxData(
    userId: string,
    date: string,
    timeSlots: TimeSlot[],
    intervalMinutes?: 30 | 60 | 120
  ): Promise<void> {
    if (!userId) {
      console.warn('TimeboxService: saveTimeboxData called without userId')
      return
    }

    console.group('🔍 TIMEBOX SERVICE: saveTimeboxData called')
    console.log('Parameters:', { userId, date, intervalMinutes })

    // Detect interval from current slots if not provided
    let detectedInterval = intervalMinutes
    if (!detectedInterval && timeSlots.length > 0) {
      const [startHour, startMinute] = timeSlots[0].startTime.split(':').map(Number)
      const [endHour, endMinute] = timeSlots[0].endTime.split(':').map(Number)
      detectedInterval = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) as 30 | 60 | 120
      console.log('🕒 Detected interval from slots:', detectedInterval, 'minutes')
    } else if (!detectedInterval) {
      detectedInterval = 120 // Default fallback
    }
    
    try {
      // Convert timeSlots to a simple object for storage
      const slotsData: Record<string, TimeboxTask[]> = {}
      let totalTasksToSave = 0
      
      timeSlots.forEach(slot => {
        if (slot.tasks.length > 0) {
          slotsData[slot.id] = slot.tasks
          totalTasksToSave += slot.tasks.length
        }
      })
      

      const { db, doc, collection, query, where, getDocs, setDoc, updateDoc, serverTimestamp } = await getFirebase()
      
      const timeboxData: TimeboxData = {
        userId,
        date,
        slots: slotsData,
        intervalMinutes: detectedInterval,
        updatedAt: serverTimestamp(),
      }

      // Use date as document ID for easy retrieval
      const docId = `${userId}-${date}`
      const docRef = doc(db, 'users', userId, 'timeboxes', docId)
      
      const existingDocQuery = query(
        collection(db, 'users', userId, 'timeboxes'),
        where('date', '==', date)
      )
      const existingDoc = await getDocs(existingDocQuery)

      if (existingDoc.empty) {
        await setDoc(docRef, {
          ...timeboxData,
          createdAt: serverTimestamp()
        })
      } else {
        await updateDoc(docRef, {
          userId,
          date,
          slots: slotsData,
          intervalMinutes: detectedInterval,
          updatedAt: serverTimestamp(),
        })
      }
      
    } catch (error) {
      console.error('❌ Error saving timebox data:', error)
      throw error
    } finally {
      console.groupEnd()
    }
  }

  /**
   * Delete timebox data from Firestore
   */
  static async deleteTimeboxData(userId: string, date: string): Promise<void> {
    if (!userId) {
      console.warn('TimeboxService: deleteTimeboxData called without userId')
      return
    }

    try {
      const { db, collection, query, where, getDocs, deleteDoc } = await getFirebase()
      
      const timeboxQuery = query(
        collection(db, 'users', userId, 'timeboxes'),
        where('date', '==', date)
      )
      
      const timeboxDoc = await getDocs(timeboxQuery)
      
      if (!timeboxDoc.empty) {
        await deleteDoc(timeboxDoc.docs[0].ref)
      }
    } catch (error) {
      throw error
    }
  }
}
