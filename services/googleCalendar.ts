import { auth as firebaseAuth, db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

declare global {
  interface Window {
    gapi: any
    google: any
  }
}

interface GoogleCalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  recurrence?: string[]
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
  }>
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: string
      minutes: number
    }>
  }
}

interface Calendar {
  id: string
  summary: string
  description?: string
  primary?: boolean
  backgroundColor?: string
  foregroundColor?: string
}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService
  private tokenClient: any
  private gapiInited = false
  private gisInited = false
  private calendars: Calendar[] = []

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService()
    }
    return GoogleCalendarService.instance
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      this.loadGoogleApis()
    }
  }

  private async loadGoogleApis() {
    // Check if environment variables are present
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {

      return
    }

    // Load GAPI with Promise-based approach for better reliability
    if (!window.gapi) {

      try {
        await this.loadScript('https://apis.google.com/js/api.js')

        this.gapiLoaded()
      } catch (error) {
        console.error('Failed to load GAPI script:', error)
        this.gapiInited = false
      }
    } else {

      this.gapiLoaded()
    }

    // Load GIS with Promise-based approach
    if (!window.google?.accounts) {

      try {
        await this.loadScript('https://accounts.google.com/gsi/client')

        // Give the script a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 500))
        this.gisLoaded()
      } catch (error) {
        console.error('Failed to load GIS script:', error)
        this.gisInited = false
      }
    } else {

      this.gisLoaded()
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${src}"]`)
      if (existingScript) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
      document.head.appendChild(script)
    })
  }

  private gapiLoaded() {
    if (!window.gapi) {
      console.error('GAPI not loaded')
      return
    }

    window.gapi.load('client', async () => {
      try {

        await window.gapi.client.init({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
          discoveryDocs: [process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_DISCOVERY_DOC],
        })

        this.gapiInited = true
        this.maybeEnableButtons()
      } catch (error) {
        console.error('Failed to initialize GAPI client:', error)
        this.gapiInited = false
      }
    }, (error: any) => {
      console.error('Failed to load GAPI client:', error)
      this.gapiInited = false
    })
  }

  private gisLoaded() {
    try {
      // Check if Google Identity Services is available
      if (!window.google?.accounts?.oauth2) {
        console.error('[GoogleCalendar] Google Identity Services not available on window.google.accounts.oauth2')
        this.gisInited = false
        return
      }

      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SCOPES,
        callback: '', // defined later
      })
      this.gisInited = true
      this.maybeEnableButtons()
    } catch (error) {
      console.error('Failed to initialize GIS token client:', error)
      this.gisInited = false
    }
  }

  private maybeEnableButtons() {
    if (this.gapiInited && this.gisInited) {
    }
  }

  // Get current user ID from Firebase
  private async getCurrentUserId(): Promise<string | null> {
    return firebaseAuth.currentUser?.uid || null
  }

  // Store access token in Firebase with expiration time
  private async storeAccessToken(accessToken: string, expiresIn?: number): Promise<void> {
    const userId = await this.getCurrentUserId()
    if (!userId) return

    const userRef = doc(db, 'users', userId, 'settings', 'googleCalendar')
    const expiresAt = expiresIn 
      ? new Date(Date.now() + (expiresIn * 1000)) 
      : new Date(Date.now() + (3600 * 1000)) // Default to 1 hour

    await setDoc(
      userRef,
      {
        google_access_token: accessToken,
        expiresAt,
        updatedAt: new Date(),
      },
      { merge: true }
    )
  }

  // Get stored access token from Firebase
  async getStoredAccessToken(): Promise<string | null> {
    const userId = await this.getCurrentUserId()
    if (!userId) return null

    const userRef = doc(db, 'users', userId, 'settings', 'googleCalendar')
    const docSnap = await getDoc(userRef)
    const data = docSnap.data()
    
    if (!data?.google_access_token) return null
    
    // Check if token is expired
    if (data.expiresAt) {
      const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)
      if (expiresAt < new Date()) {
        console.log('[GoogleCalendar] Stored token has expired')
        return null
      }
    }
    
    return data.google_access_token
  }

  async authorize(immediate = false): Promise<boolean> {
    
    if (!this.gapiInited || !this.gisInited) {

      return false
    }

    // Check for existing token
    const existingToken = await this.getStoredAccessToken()
    
    if (existingToken) {
      window.gapi.client.setToken({ access_token: existingToken })
      try {
        // Test if token is still valid
        await window.gapi.client.calendar.calendarList.list({ maxResults: 1 })
        console.log('[GoogleCalendar] Using valid stored token')
        return true
      } catch (error: any) {
        // Token is invalid or expired, clear it

        window.gapi.client.setToken('')
        
        // Clear the invalid token from storage
        const userId = await this.getCurrentUserId()
        if (userId) {
          const userRef = doc(db, 'users', userId, 'settings', 'googleCalendar')
          await setDoc(
            userRef,
            {
              google_access_token: null,
              expiresAt: null,
              updatedAt: new Date(),
            },
            { merge: true }
          )
        }
        
        // If immediate mode, don't try to re-authenticate
        if (immediate) {
          return false
        }
      }
    }

    if (immediate) {
      return false
    }

    return new Promise(resolve => {
      this.tokenClient.callback = async (resp: any) => {
        if (resp.error) {
          console.error('Token error:', resp.error)
          resolve(false)
          return
        }

        // Store the new token with expiration time
        await this.storeAccessToken(resp.access_token, resp.expires_in)
        
        // Set the token in gapi client
        window.gapi.client.setToken({ access_token: resp.access_token })
        
        resolve(true)
      }

      this.tokenClient.requestAccessToken({ prompt: '' })
    })
  }

  async signOut() {
    const token = window.gapi.client.getToken()
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token)
      window.gapi.client.setToken('')

      // Clear stored token
      const userId = await this.getCurrentUserId()
      if (userId) {
        const userRef = doc(db, 'users', userId, 'settings', 'googleCalendar')
        await setDoc(
          userRef,
          {
            google_access_token: null,
            updatedAt: new Date(),
          },
          { merge: true }
        )
      }
    }
  }

  async listCalendars(): Promise<Calendar[]> {
    try {
      const response = await window.gapi.client.calendar.calendarList.list({
        maxResults: 50,
        showHidden: false,
      })

      this.calendars = response.result.items || []
      return this.calendars
    } catch (error: any) {
      console.error('Error listing calendars:', error)
      
      // If we get a 401, it means our token is invalid
      if (error.status === 401) {
        console.log('[GoogleCalendar] Token invalid, clearing stored token')
        // Clear the invalid token
        const userId = await this.getCurrentUserId()
        if (userId) {
          const userRef = doc(db, 'users', userId, 'settings', 'googleCalendar')
          await setDoc(
            userRef,
            {
              google_access_token: null,
              expiresAt: null,
              updatedAt: new Date(),
            },
            { merge: true }
          )
        }
        window.gapi.client.setToken('')
      }
      
      return []
    }
  }

  async listEvents(
    calendarId = 'primary',
    timeMin?: Date,
    timeMax?: Date,
    maxResults = 250
  ): Promise<GoogleCalendarEvent[]> {
    try {
      // Validate dates before using them
      const isValidDate = (date: Date): boolean => {
        return date instanceof Date && !isNaN(date.getTime())
      }

      const validTimeMin = timeMin && isValidDate(timeMin) ? timeMin.toISOString() : new Date().toISOString()
      const validTimeMax = timeMax && isValidDate(timeMax) ? timeMax.toISOString() : undefined

      const response = await window.gapi.client.calendar.events.list({
        calendarId,
        timeMin: validTimeMin,
        timeMax: validTimeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      })

      return response.result.items || []
    } catch (error) {
      console.error('Error listing events:', error)
      return []
    }
  }

  async createEvent(
    calendarId = 'primary',
    event: GoogleCalendarEvent
  ): Promise<GoogleCalendarEvent | null> {
    try {
      const response = await window.gapi.client.calendar.events.insert({
        calendarId,
        resource: event,
      })

      return response.result
    } catch (error) {
      console.error('Error creating event:', error)
      return null
    }
  }

  async updateEvent(
    calendarId = 'primary',
    eventId: string,
    event: GoogleCalendarEvent
  ): Promise<GoogleCalendarEvent | null> {
    try {
      const response = await window.gapi.client.calendar.events.update({
        calendarId,
        eventId,
        resource: event,
      })

      return response.result
    } catch (error) {
      console.error('Error updating event:', error)
      return null
    }
  }

  async deleteEvent(calendarId = 'primary', eventId: string): Promise<boolean> {
    try {
      await window.gapi.client.calendar.events.delete({
        calendarId,
        eventId,
      })

      return true
    } catch (error) {
      console.error('Error deleting event:', error)
      return false
    }
  }

  getCalendars(): Calendar[] {
    return this.calendars
  }

  isAuthorized(): boolean {
    return !!window.gapi?.client?.getToken()?.access_token
  }

  isReady(): boolean {
    return this.gapiInited && this.gisInited
  }

  getInitStatus(): { gapiInited: boolean; gisInited: boolean; hasEnvVars: boolean } {
    return {
      gapiInited: this.gapiInited,
      gisInited: this.gisInited,
      hasEnvVars: !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_API_KEY),
    }
  }

  // Manual initialization method for debugging
  async initializeManually() {

    // Retry loading if needed
    if (!this.gapiInited || !this.gisInited) {

      await this.loadGoogleApis()
      
      // Wait longer for scripts to load
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Try to initialize again if scripts are now loaded
      if (window.gapi && !this.gapiInited) {

        this.gapiLoaded()
      }
      if (window.google?.accounts && !this.gisInited) {

        this.gisLoaded()
      }
      
      // Wait a bit more and check again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return this.getInitStatus()
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance()

// Cleanup function for when the service is destroyed
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const service = GoogleCalendarService.getInstance()
    if (service['tokenRefreshTimer']) {
      clearTimeout(service['tokenRefreshTimer'])
    }
  })
}