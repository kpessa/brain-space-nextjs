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
      console.error('Missing Google Calendar environment variables:', {
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'present' : 'MISSING',
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? 'present' : 'MISSING',
      })
      return
    }

    // Load GAPI with Promise-based approach for better reliability
    if (!window.gapi) {
      console.log('[GoogleCalendar] Loading GAPI script...')
      try {
        await this.loadScript('https://apis.google.com/js/api.js')
        console.log('[GoogleCalendar] GAPI script loaded successfully')
        this.gapiLoaded()
      } catch (error) {
        console.error('Failed to load GAPI script:', error)
        this.gapiInited = false
      }
    } else {
      console.log('[GoogleCalendar] GAPI already available, initializing...')
      this.gapiLoaded()
    }

    // Load GIS with Promise-based approach
    if (!window.google?.accounts) {
      console.log('[GoogleCalendar] Loading GIS script...')
      try {
        await this.loadScript('https://accounts.google.com/gsi/client')
        console.log('[GoogleCalendar] GIS script loaded successfully')
        
        // Give the script a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 500))
        this.gisLoaded()
      } catch (error) {
        console.error('Failed to load GIS script:', error)
        this.gisInited = false
      }
    } else {
      console.log('[GoogleCalendar] GIS already available, initializing...')
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
    
    console.log('[GoogleCalendar] Loading GAPI client...')
    window.gapi.load('client', async () => {
      try {
        console.log('[GoogleCalendar] Initializing GAPI client with:', {
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? 'present' : 'missing',
          discoveryDoc: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_DISCOVERY_DOC
        })

        await window.gapi.client.init({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
          discoveryDocs: [process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_DISCOVERY_DOC],
        })
        
        console.log('[GoogleCalendar] GAPI client initialized successfully')
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

      console.log('[GoogleCalendar] Initializing GIS with:', {
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'present' : 'missing',
        scopes: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SCOPES,
      })
      
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

  // Store access token in Firebase
  private async storeAccessToken(accessToken: string): Promise<void> {
    const userId = await this.getCurrentUserId()
    if (!userId) return

    const userRef = doc(db, 'users', userId, 'settings', 'googleCalendar')
    await setDoc(
      userRef,
      {
        google_access_token: accessToken,
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
    return docSnap.data()?.google_access_token || null
  }

  async authorize(immediate = false): Promise<boolean> {
    
    if (!this.gapiInited || !this.gisInited) {
      console.error('Google APIs not loaded - GAPI:', this.gapiInited, 'GIS:', this.gisInited)
      return false
    }

    // Check for existing token
    const existingToken = await this.getStoredAccessToken()
    
    if (existingToken) {
      window.gapi.client.setToken({ access_token: existingToken })
      try {
        // Test if token is still valid
        await window.gapi.client.calendar.calendarList.list({ maxResults: 1 })
        return true
      } catch (error: any) {
        // Token is invalid or expired, clear it
        console.log('Existing token is invalid, clearing...')
        window.gapi.client.setToken('')
        
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

        // Store the new token
        await this.storeAccessToken(resp.access_token)
        
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
    } catch (error) {
      console.error('Error listing calendars:', error)
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
    console.log('[GoogleCalendar] Manual initialization - checking APIs:', {
      gapi: !!window.gapi,
      google: !!window.google,
      googleAccounts: !!window.google?.accounts,
    })
    
    // Retry loading if needed
    if (!this.gapiInited || !this.gisInited) {
      console.log('[GoogleCalendar] Attempting to reload Google APIs...')
      await this.loadGoogleApis()
      
      // Wait longer for scripts to load
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Try to initialize again if scripts are now loaded
      if (window.gapi && !this.gapiInited) {
        console.log('[GoogleCalendar] Retrying GAPI initialization...')
        this.gapiLoaded()
      }
      if (window.google?.accounts && !this.gisInited) {
        console.log('[GoogleCalendar] Retrying GIS initialization...')
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