# Google Calendar Authentication Guide

This guide shows how to use the robust Google Calendar authentication system that persists across your entire webapp.

## Overview

The new authentication system provides:
- **Persistent authentication** - stays logged in across app navigation
- **Automatic token refresh** - handles expired tokens seamlessly
- **Integrated with main auth** - works with your Firebase authentication
- **Easy to use hooks** - simple API for components
- **Debug capabilities** - built-in debugging tools

## Setup

### 1. Environment Variables

Ensure these are set in your `.env.local`:

```env
# Google Calendar API Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key_here
NEXT_PUBLIC_GOOGLE_CALENDAR_DISCOVERY_DOC=https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest
NEXT_PUBLIC_GOOGLE_CALENDAR_SCOPES=https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events
```

### 2. Usage in Components

#### Basic Usage with Hook

```tsx
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'

function MyCalendarComponent() {
  const { 
    isConnected, 
    isLoading, 
    connect, 
    getEvents, 
    createEvent 
  } = useGoogleCalendar()

  const handleConnect = async () => {
    const success = await connect()
    if (success) {
      console.log('Connected to Google Calendar!')
    }
  }

  const loadEvents = async () => {
    if (isConnected) {
      const events = await getEvents('primary', new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      console.log('Upcoming events:', events)
    }
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>
          Connect Google Calendar
        </button>
      ) : (
        <div>
          <p>✅ Google Calendar Connected</p>
          <button onClick={loadEvents}>Load Events</button>
        </div>
      )}
    </div>
  )
}
```

#### Advanced Usage with Auth Context

```tsx
import { useAuth } from '@/contexts/AuthContext'

function CalendarSettings() {
  const { 
    connectGoogleCalendar, 
    disconnectGoogleCalendar, 
    isGoogleCalendarConnected,
    refreshGoogleCalendarAuth 
  } = useAuth()

  const handleConnect = async () => {
    const success = await connectGoogleCalendar()
    if (success) {
      // Calendar is now connected and will persist
      console.log('Connected!')
    }
  }

  const handleRefresh = async () => {
    const success = await refreshGoogleCalendarAuth()
    if (success) {
      console.log('Authentication refreshed!')
    }
  }

  return (
    <div>
      <p>Status: {isGoogleCalendarConnected() ? 'Connected' : 'Not Connected'}</p>
      <button onClick={handleConnect}>Connect</button>
      <button onClick={handleRefresh}>Refresh Auth</button>
      <button onClick={disconnectGoogleCalendar}>Disconnect</button>
    </div>
  )
}
```

### 3. Calendar Operations

#### Get Calendars

```tsx
const { getCalendars } = useGoogleCalendar()

const calendars = await getCalendars()
console.log('Available calendars:', calendars)
```

#### Get Events

```tsx
const { getEvents } = useGoogleCalendar()

// Get events from primary calendar for next 7 days
const events = await getEvents(
  'primary', 
  new Date(), 
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
)
```

#### Create Event

```tsx
const { createEvent } = useGoogleCalendar()

const newEvent = {
  summary: 'Meeting with Team',
  description: 'Weekly team sync',
  start: {
    dateTime: '2025-01-15T10:00:00',
    timeZone: 'America/New_York'
  },
  end: {
    dateTime: '2025-01-15T11:00:00',
    timeZone: 'America/New_York'
  }
}

const createdEvent = await createEvent('primary', newEvent)
```

#### Update Event

```tsx
const { updateEvent } = useGoogleCalendar()

const updatedEvent = await updateEvent('primary', 'event-id', {
  summary: 'Updated Meeting Title'
})
```

#### Delete Event

```tsx
const { deleteEvent } = useGoogleCalendar()

const success = await deleteEvent('primary', 'event-id')
```

## Features

### Automatic Token Refresh

The system automatically refreshes tokens 5 minutes before they expire, ensuring uninterrupted access.

### Persistent Storage

Tokens are stored securely in Firestore and associated with the authenticated user, persisting across:
- Page refreshes
- App navigation
- Browser sessions (until token expires)

### Error Handling

```tsx
const { hasError, errorMessage, refresh } = useGoogleCalendar()

if (hasError) {
  console.error('Calendar error:', errorMessage)
  // Try to refresh authentication
  await refresh()
}
```

### Debug Information

```tsx
const { getDebugInfo } = useGoogleCalendar()

const debugInfo = await getDebugInfo()
console.log('Debug info:', debugInfo)
// Shows token status, expiration, service state, etc.
```

## Status Component

Use the included `GoogleCalendarStatus` component to show connection status:

```tsx
import GoogleCalendarStatus from '@/components/GoogleCalendarStatus'

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <GoogleCalendarStatus />
    </div>
  )
}
```

## Integration with Sign-In

When users sign in with Google, the system automatically requests calendar permissions and stores the token if granted. This provides seamless authentication.

## Security Notes

- API keys and tokens are stored securely
- Client-side tokens are automatically cleared on sign-out
- Server-side tokens are associated with user IDs in Firestore
- Automatic token expiration handling prevents stale access

## Troubleshooting

### Check Service Status

```tsx
const { getDebugInfo } = useGoogleCalendar()
const debug = await getDebugInfo()

console.log('Service ready:', debug.initStatus.gapiInited && debug.initStatus.gisInited)
console.log('Has stored token:', debug.tokenInfo.hasStoredToken)
console.log('Token expired:', debug.tokenInfo.tokenExpired)
```

### Manual Refresh

If authentication seems stuck, manually refresh:

```tsx
const { refresh } = useGoogleCalendar()
await refresh()
```

### Environment Check

Ensure all required environment variables are set and the Google Cloud project is configured correctly with the Calendar API enabled.