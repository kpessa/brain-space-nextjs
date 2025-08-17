'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { IOSButton } from '@/components/ui/IOSButton'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { useIOSKeyboardAvoidance } from '@/hooks/useIOSKeyboardAvoidance'
import { useHaptic } from '@/lib/haptic'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { 
  Smartphone, 
  Vibrate, 
  Keyboard, 
  Layers,
  ChevronUp,
  RefreshCw
} from 'lucide-react'

export function IOSFeatureDemo() {
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [showFormSheet, setShowFormSheet] = useState(false)
  const [showPullDemo, setShowPullDemo] = useState(false)
  const [formData, setFormData] = useState({ name: '', message: '' })
  const [refreshCount, setRefreshCount] = useState(0)
  
  const haptic = useHaptic()
  const { isIOS } = useIOSKeyboardAvoidance()
  
  const handleRefresh = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setRefreshCount(prev => prev + 1)
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">iOS Feature Showcase</h2>
        <p className="text-muted-foreground">
          {isIOS 
            ? "You're on iOS! All features are optimized for your device."
            : "You're not on iOS, but you can still preview the features."}
        </p>
      </div>
      
      {/* Bottom Sheet Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Bottom Sheet Modal
        </h3>
        <p className="text-sm text-muted-foreground">
          iOS-style bottom sheet that slides up from the bottom with swipe-to-dismiss
        </p>
        <IOSButton 
          onClick={() => setShowBottomSheet(true)}
          variant="primary"
          haptic="medium"
        >
          Open Bottom Sheet
        </IOSButton>
      </div>
      
      {/* Haptic Feedback Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Vibrate className="w-5 h-5" />
          Haptic Feedback
        </h3>
        <p className="text-sm text-muted-foreground">
          {haptic.isSupported 
            ? "Haptic feedback is available! Try the buttons below."
            : "Haptic feedback is not supported on this device."}
        </p>
        <div className="flex flex-wrap gap-2">
          <IOSButton onClick={() => haptic.light()} variant="secondary" size="sm">
            Light
          </IOSButton>
          <IOSButton onClick={() => haptic.medium()} variant="secondary" size="sm">
            Medium
          </IOSButton>
          <IOSButton onClick={() => haptic.heavy()} variant="secondary" size="sm">
            Heavy
          </IOSButton>
          <IOSButton onClick={() => haptic.success()} variant="secondary" size="sm">
            Success
          </IOSButton>
          <IOSButton onClick={() => haptic.error()} variant="destructive" size="sm">
            Error
          </IOSButton>
        </div>
      </div>
      
      {/* Keyboard Avoidance Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Keyboard className="w-5 h-5" />
          Keyboard Avoidance
        </h3>
        <p className="text-sm text-muted-foreground">
          Forms automatically adjust when the keyboard appears
        </p>
        <IOSButton 
          onClick={() => setShowFormSheet(true)}
          variant="primary"
          haptic="medium"
        >
          Open Form Example
        </IOSButton>
      </div>
      
      {/* Pull to Refresh Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Pull to Refresh
        </h3>
        <p className="text-sm text-muted-foreground">
          Native iOS-style pull to refresh with haptic feedback
        </p>
        <IOSButton 
          onClick={() => setShowPullDemo(true)}
          variant="primary"
          haptic="medium"
        >
          Try Pull to Refresh
        </IOSButton>
      </div>
      
      {/* iOS Detection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Device Information
        </h3>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div>
            <span className="font-medium">Platform:</span>{' '}
            {isIOS ? 'iOS Device' : 'Non-iOS Device'}
          </div>
          <div>
            <span className="font-medium">Haptic Support:</span>{' '}
            {haptic.isSupported ? 'Yes' : 'No'}
          </div>
          <div>
            <span className="font-medium">User Agent:</span>{' '}
            <span className="text-xs break-all">{navigator.userAgent}</span>
          </div>
        </div>
      </div>
      
      {/* Bottom Sheet Component */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="iOS Bottom Sheet"
        height="auto"
      >
        <div className="space-y-4 pb-6">
          <p className="text-muted-foreground">
            This is an iOS-style bottom sheet modal. Try swiping down to dismiss!
          </p>
          
          <div className="space-y-2">
            <h4 className="font-medium">Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Swipe down to dismiss</li>
              <li>Tap backdrop to close</li>
              <li>Safe area padding for iPhone</li>
              <li>Smooth animations</li>
              <li>Keyboard avoidance built-in</li>
            </ul>
          </div>
          
          <div className="flex gap-2">
            <IOSButton 
              onClick={() => {
                haptic.success()
                setShowBottomSheet(false)
              }}
              variant="primary"
              fullWidth
            >
              Done
            </IOSButton>
            <IOSButton 
              onClick={() => setShowBottomSheet(false)}
              variant="ghost"
              fullWidth
            >
              Cancel
            </IOSButton>
          </div>
        </div>
      </BottomSheet>
      
      {/* Form Sheet with Keyboard Avoidance */}
      <BottomSheet
        isOpen={showFormSheet}
        onClose={() => setShowFormSheet(false)}
        title="Form with Keyboard Avoidance"
        height="half"
      >
        <div className="space-y-4 pb-6">
          <p className="text-sm text-muted-foreground">
            The view automatically adjusts when you focus on inputs
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your name"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Type your message here..."
                className="mt-1 min-h-[100px]"
              />
            </div>
            
            <IOSButton 
              onClick={() => {
                haptic.success()
                setShowFormSheet(false)
                setFormData({ name: '', message: '' })
              }}
              variant="primary"
              fullWidth
            >
              Submit
            </IOSButton>
          </div>
        </div>
      </BottomSheet>
      
      {/* Pull to Refresh Demo Sheet */}
      <BottomSheet
        isOpen={showPullDemo}
        onClose={() => setShowPullDemo(false)}
        title="Pull to Refresh Demo"
        height="full"
      >
        <PullToRefresh
          onRefresh={handleRefresh}
          className="h-[500px]"
        >
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Swipe down from the top to refresh the content
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium">Refresh Count: {refreshCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Each pull to refresh increments this counter
              </p>
            </div>
            
            {/* Sample content to scroll */}
            <div className="space-y-3">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg p-3 border">
                  <h4 className="font-medium">Item {i + 1}</h4>
                  <p className="text-sm text-muted-foreground">
                    Sample content item to demonstrate scrolling
                  </p>
                </div>
              ))}
            </div>
          </div>
        </PullToRefresh>
      </BottomSheet>
    </div>
  )
}