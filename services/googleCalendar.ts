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

    // Check if scripts are already loaded
    const existingGapiScript = document.querySelector('script[src*="apis.google.com/js/api.js"]')
    const existingGisScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]')

    // Load GAPI if not already loaded
    if (!existingGapiScript) {
      const gapiScript = document.createElement('script')
      gapiScript.src = 'https://apis.google.com/js/api.js'
      gapiScript.async = true
      gapiScript.defer = true
      gapiScript.onload = () => {
        console.log('GAPI script loaded')
        this.gapiLoaded()
      }
      gapiScript.onerror = () => {
        console.error('Failed to load GAPI script')
        this.gapiInited = false
      }
      document.body.appendChild(gapiScript)
    } else if (window.gapi) {
      // Script already loaded, initialize directly
      this.gapiLoaded()
    }

    // Load GIS if not already loaded
    if (!existingGisScript) {
      const gisScript = document.createElement('script')
      gisScript.src = 'https://accounts.google.com/gsi/client'
      gisScript.async = true
      gisScript.defer = true
      gisScript.onload = () => {
        console.log('GIS script loaded')
        this.gisLoaded()
      }
      gisScript.onerror = () => {
        console.error('Failed to load GIS script')
        this.gisInited = false
      }
      document.body.appendChild(gisScript)
    } else if (window.google?.accounts) {
      // Script already loaded, initialize directly
      this.gisLoaded()
    }
  }

  private gapiLoaded() {
    if (!window.gapi) {
      console.error('GAPI not loaded')
      return
    }
    
    window.gapi.load('client', async () => {
      try {
        console.log('Initializing GAPI client with:', {
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? 'present' : 'missing',
          discoveryDoc: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_DISCOVERY_DOC,
        })
        
        await window.gapi.client.init({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
          discoveryDocs: [process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_DISCOVERY_DOC],
        })
        this.gapiInited = true
        console.log('GAPI client initialized successfully')
        this.maybeEnableButtons()
      } catch (error) {
        console.error('Failed to initialize GAPI client:', error)
        this.gapiInited = false
      }
    })
  }

  private gisLoaded() {
    try {
      console.log('Initializing GIS token client with:', {
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'present' : 'missing',
        scopes: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SCOPES,
      })
      
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SCOPES,
        callback: '', // defined later
      })
      this.gisInited = true
      console.log('GIS token client initialized successfully')
      this.maybeEnableButtons()
    } catch (error) {
      console.error('Failed to initialize GIS token client:', error)
      this.gisInited = false
    }
  }

  private maybeEnableButtons() {
    if (this.gapiInited && this.gisInited) {
      console.log('Google APIs loaded and ready')
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
  private async getStoredAccessToken(): Promise<string | null> {
    const userId = await this.getCurrentUserId()
    if (!userId) return null

    const userRef = doc(db, 'users', userId, 'settings', 'googleCalendar')
    const docSnap = await getDoc(userRef)
    return docSnap.data()?.google_access_token || null
  }

  async authorize(immediate = false): Promise<boolean> {
    console.log('authorize called with immediate:', immediate)
    console.log('API states - GAPI:', this.gapiInited, 'GIS:', this.gisInited)
    
    if (!this.gapiInited || !this.gisInited) {
      console.error('Google APIs not loaded - GAPI:', this.gapiInited, 'GIS:', this.gisInited)
      return false
    }

    // Check for existing token
    const existingToken = await this.getStoredAccessToken()
    console.log('Existing token:', existingToken ? 'found' : 'not found')
    
    if (existingToken) {
      window.gapi.client.setToken({ access_token: existingToken })
      try {
        // Test if token is still valid
        console.log('Testing existing token validity...')
        await window.gapi.client.calendar.calendarList.list({ maxResults: 1 })
        console.log('Existing token is valid')
        return true
      } catch (error) {
        console.log('Stored token invalid, error:', error)
      }
    }

    if (immediate) {
      console.log('Immediate mode - returning false as no valid token')
      return false
    }

    console.log('Requesting new access token...')
    return new Promise(resolve => {
      this.tokenClient.callback = async (resp: any) => {
        if (resp.error) {
          console.error('Token error:', resp.error)
          resolve(false)
          return
        }

        console.log('Received new access token')
        // Store the new token
        await this.storeAccessToken(resp.access_token)
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
      const response = await window.gapi.client.calendar.events.list({
        calendarId,
        timeMin: timeMin ? timeMin.toISOString() : new Date().toISOString(),
        timeMax: timeMax ? timeMax.toISOString() : undefined,
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
    console.log('Manual initialization started')
    console.log('Current status:', this.getInitStatus())
    console.log('Window objects:', {
      gapi: !!window.gapi,
      google: !!window.google,
      googleAccounts: !!window.google?.accounts,
    })
    
    // Retry loading if needed
    if (!this.gapiInited || !this.gisInited) {
      await this.loadGoogleApis()
      
      // Wait a bit for scripts to load
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Try to initialize again if scripts are now loaded
      if (window.gapi && !this.gapiInited) {
        this.gapiLoaded()
      }
      if (window.google?.accounts && !this.gisInited) {
        this.gisLoaded()
      }
    }
    
    return this.getInitStatus()
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance()