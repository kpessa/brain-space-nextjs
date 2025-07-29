'use client'

import { useUserPreferencesStore } from '@/store/userPreferencesStore'
import { Sun, Moon, Monitor, Palette } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

export function ThemeToggle() {
  const { 
    darkMode, 
    themeMode, 
    currentMode, 
    autoThemeInWorkMode,
    toggleDarkMode, 
    setThemeMode, 
    updateSettings 
  } = useUserPreferencesStore()
  const [showMenu, setShowMenu] = useState(false)
  
  const effectiveTheme = useUserPreferencesStore(state => state.getEffectiveTheme())
  
  return (
    <div className="relative">
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
        {/* Dark mode toggle */}
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleDarkMode}
          className="w-9 h-9 p-0"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <Moon className="h-5 w-5 text-yellow-500" />
          ) : (
            <Sun className="h-5 w-5 text-yellow-600" />
          )}
        </Button>
        
        {/* Theme mode toggle */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowMenu(!showMenu)}
          className="w-9 h-9 p-0"
          title="Change theme"
        >
          {effectiveTheme === 'professional' ? (
            <Monitor className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          )}
        </Button>
      </div>
      
      {/* Theme menu */}
      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-popover p-2 shadow-md z-50">
          <div className="space-y-2">
            <div className="px-2 py-1.5 text-sm font-semibold">
              Theme Settings
            </div>
            
            {/* Theme mode selection */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setThemeMode('colorful')
                  setShowMenu(false)
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent ${
                  themeMode === 'colorful' ? 'bg-accent' : ''
                }`}
              >
                <Palette className="h-4 w-4" />
                Colorful Theme
              </button>
              
              <button
                onClick={() => {
                  setThemeMode('professional')
                  setShowMenu(false)
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent ${
                  themeMode === 'professional' ? 'bg-accent' : ''
                }`}
              >
                <Monitor className="h-4 w-4" />
                Professional Theme
              </button>
            </div>
            
            <div className="border-t pt-2">
              <label className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoThemeInWorkMode}
                  onChange={(e) => {
                    updateSettings({ autoThemeInWorkMode: e.target.checked })
                  }}
                  className="rounded border-gray-300"
                />
                Auto-professional in work mode
              </label>
              
              {autoThemeInWorkMode && currentMode === 'work' && (
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  Currently using professional theme because you're in work mode
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}