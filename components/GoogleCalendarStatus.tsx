'use client'

import { useState } from 'react'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { useAuth } from '@/contexts/AuthContext'

export default function GoogleCalendarStatus() {
  const { user } = useAuth()
  const { 
    isConnected, 
    isLoading, 
    isReady, 
    hasError, 
    errorMessage,
    connect, 
    disconnect, 
    refresh,
    getDebugInfo 
  } = useGoogleCalendar()
  
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  const handleConnect = async () => {
    const success = await connect()
    if (success) {
      console.log('Successfully connected to Google Calendar')
    }
  }

  const handleDisconnect = async () => {
    await disconnect()
    console.log('Disconnected from Google Calendar')
  }

  const handleRefresh = async () => {
    const success = await refresh()
    if (success) {
      console.log('Successfully refreshed Google Calendar authentication')
    }
  }

  const handleDebug = async () => {
    const info = await getDebugInfo()
    setDebugInfo(info)
    setShowDebug(true)
  }

  if (!user) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-gray-600">Please sign in to connect Google Calendar</p>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Google Calendar Connection</h3>
        <div className="flex items-center space-x-2">
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          <div className={`w-3 h-3 rounded-full ${
            !isReady ? 'bg-gray-400' :
            isConnected ? 'bg-green-500' : 
            hasError ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Service Ready:</span>
          <span className={isReady ? 'text-green-600' : 'text-red-600'}>
            {isReady ? 'Yes' : 'No'}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span>Calendar Connected:</span>
          <span className={isConnected ? 'text-green-600' : 'text-gray-600'}>
            {isConnected ? 'Yes' : 'No'}
          </span>
        </div>
        
        {hasError && (
          <div className="flex items-center justify-between text-sm">
            <span>Error:</span>
            <span className="text-red-600 text-xs max-w-xs truncate">
              {errorMessage}
            </span>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={isLoading || !isReady}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connecting...' : 'Connect Calendar'}
          </button>
        ) : (
          <>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Disconnect
            </button>
          </>
        )}
        
        <button
          onClick={handleDebug}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Debug Info
        </button>
      </div>

      {showDebug && debugInfo && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Debug Information</h4>
            <button
              onClick={() => setShowDebug(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <pre className="text-xs overflow-auto max-h-40">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}