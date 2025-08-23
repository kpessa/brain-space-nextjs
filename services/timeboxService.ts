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
    console.log('📥 TimeboxService.loadTimeboxData: Starting', { 
      userId, 
      date, 
      timestamp: new Date().toISOString() 
    })
    
    if (!userId) {
      console.log('❌ TimeboxService.loadTimeboxData: No userId provided')
      return null
    }

    try {
      console.log('🔄 TimeboxService.loadTimeboxData: Getting Firebase imports')
      const { db, collection, query, where, getDocs } = await getFirebase()
      
      console.log('🔄 TimeboxService.loadTimeboxData: Creating query')
      const timeboxQuery = query(
        collection(db, 'users', userId, 'timeboxes'),
        where('date', '==', date)
      )
      
      console.log('🔄 TimeboxService.loadTimeboxData: Executing query')
      const timeboxDoc = await getDocs(timeboxQuery)
      
      if (!timeboxDoc.empty) {
        console.log('✅ TimeboxService.loadTimeboxData: Found data', { 
          docsCount: timeboxDoc.docs.length,
          timestamp: new Date().toISOString() 
        })
        const data = timeboxDoc.docs[0].data() as TimeboxData
        
        return {
          slots: data.slots || {},
          intervalMinutes: data.intervalMinutes
        }
      } else {
        console.log('📝 TimeboxService.loadTimeboxData: No data found', { timestamp: new Date().toISOString() })
        return null
      }
    } catch (error) {
      console.error('❌ TimeboxService.loadTimeboxData: Error', { error, timestamp: new Date().toISOString() })
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
    console.log('💾 TimeboxService.saveTimeboxData: Starting', { 
      userId, 
      date, 
      timeSlotsCount: timeSlots.length,
      intervalMinutes,
      timestamp: new Date().toISOString() 
    })
    
    if (!userId) {
      console.log('❌ TimeboxService.saveTimeboxData: No userId provided')
      return
    }

    console.group('🔍 TIMEBOX SERVICE: saveTimeboxData called')

    // Detect interval from current slots if not provided
    let detectedInterval = intervalMinutes
    if (!detectedInterval && timeSlots.length > 0) {
      const [startHour, startMinute] = timeSlots[0].startTime.split(':').map(Number)
      const [endHour, endMinute] = timeSlots[0].endTime.split(':').map(Number)
      detectedInterval = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) as 30 | 60 | 120
      console.log('🔍 TimeboxService.saveTimeboxData: Detected interval', { detectedInterval })
    } else if (!detectedInterval) {
      detectedInterval = 120 // Default fallback
      console.log('🔍 TimeboxService.saveTimeboxData: Using default interval', { detectedInterval })
    }
    
    try {
      console.log('🔄 TimeboxService.saveTimeboxData: Converting timeSlots to storage format')
      // Convert timeSlots to a simple object for storage
      const slotsData: Record<string, TimeboxTask[]> = {}
      let totalTasksToSave = 0
      
      timeSlots.forEach(slot => {
        if (slot.tasks.length > 0) {
          slotsData[slot.id] = slot.tasks
          totalTasksToSave += slot.tasks.length
        }
      })

      console.log('🔄 TimeboxService.saveTimeboxData: Getting Firebase imports')
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
      
      console.log('🔄 TimeboxService.saveTimeboxData: Checking for existing document')
      const existingDocQuery = query(
        collection(db, 'users', userId, 'timeboxes'),
        where('date', '==', date)
      )
      const existingDoc = await getDocs(existingDocQuery)

      if (existingDoc.empty) {
        console.log('📝 TimeboxService.saveTimeboxData: Creating new document')
        await setDoc(docRef, {
          ...timeboxData,
          createdAt: serverTimestamp()
        })
        console.log('✅ TimeboxService.saveTimeboxData: New document created')
      } else {
        console.log('📝 TimeboxService.saveTimeboxData: Updating existing document')
        await updateDoc(docRef, {
          userId,
          date,
          slots: slotsData,
          intervalMinutes: detectedInterval,
          updatedAt: serverTimestamp(),
        })
        console.log('✅ TimeboxService.saveTimeboxData: Document updated')
      }
      
      console.log('✅ TimeboxService.saveTimeboxData: Save completed successfully', { 
        totalTasksToSave,
        timestamp: new Date().toISOString() 
      })
      
    } catch (error) {
      console.error('❌ TimeboxService.saveTimeboxData: Error saving timebox data:', error)
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
