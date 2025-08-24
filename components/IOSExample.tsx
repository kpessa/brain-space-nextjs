'use client'

import { useState } from 'react'
import { useIOS } from '@/contexts/IOSContext'
import { IOSButton } from '@/components/ui/IOSButton'

export function IOSExample() {
  const [inputValue, setInputValue] = useState('')
  const ios = useIOS()
  
  return (
    <div className="p-4 space-y-4">
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-2">iOS Features Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Device:</span>
            <span className="font-medium">{ios.isIOS ? 'iOS Device' : 'Non-iOS'}</span>
          </div>
          <div className="flex justify-between">
            <span>Has Notch:</span>
            <span className="font-medium">{ios.hasNotch ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span>PWA Mode:</span>
            <span className="font-medium">{ios.isStandalone ? 'Standalone' : 'Browser'}</span>
          </div>
          <div className="flex justify-between">
            <span>Haptic Support:</span>
            <span className="font-medium">{ios.supportsHaptic ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span>Biometric:</span>
            <span className="font-medium">
              {ios.supportsFaceID ? 'Face ID' : ios.supportsTouchID ? 'Touch ID' : 'None'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-2">Haptic Feedback Test</h3>
        <div className="grid grid-cols-2 gap-2">
          <IOSButton 
            variant="primary" 
            haptic="light"
            onClick={() => ios.haptic.light()}
          >
            Light
          </IOSButton>
          <IOSButton 
            variant="primary" 
            haptic="medium"
            onClick={() => ios.haptic.medium()}
          >
            Medium
          </IOSButton>
          <IOSButton 
            variant="primary" 
            haptic="heavy"
            onClick={() => ios.haptic.heavy()}
          >
            Heavy
          </IOSButton>
          <IOSButton 
            variant="secondary" 
            haptic="selection"
            onClick={() => ios.haptic.selection()}
          >
            Selection
          </IOSButton>
          <IOSButton 
            variant="secondary" 
            haptic="success"
            onClick={() => ios.haptic.success()}
          >
            Success
          </IOSButton>
          <IOSButton 
            variant="destructive" 
            haptic="error"
            onClick={() => ios.haptic.error()}
          >
            Error
          </IOSButton>
        </div>
      </div>
      
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-2">Keyboard Avoidance Test</h3>
        <p className="text-sm text-gray-600 mb-3">
          Focus the input below on iOS to test keyboard avoidance
        </p>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Tap here to test keyboard avoidance"
        />
        <div className="mt-2 text-xs text-gray-500">
          Active Element: {ios.activeElement ? 'Input Focused' : 'None'}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-4">
        Note: Some features like haptic feedback work best on actual iOS devices.
      </div>
    </div>
  )
}