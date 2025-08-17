'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { createHapticHandler, HapticFeedbackType } from '@/lib/haptic'

interface IOSButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  haptic?: HapticFeedbackType | false
  fullWidth?: boolean
}

export const IOSButton = forwardRef<HTMLButtonElement, IOSButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    haptic = 'light',
    fullWidth = false,
    onClick,
    children,
    disabled,
    ...props 
  }, ref) => {
    // Variant styles matching iOS design
    const variantStyles = {
      primary: cn(
        'bg-blue-500 text-white',
        'active:bg-blue-600',
        'disabled:bg-gray-300 disabled:text-gray-500'
      ),
      secondary: cn(
        'bg-gray-100 text-gray-900',
        'active:bg-gray-200',
        'disabled:bg-gray-50 disabled:text-gray-400',
        'dark:bg-gray-800 dark:text-gray-100',
        'dark:active:bg-gray-700',
        'dark:disabled:bg-gray-900 dark:disabled:text-gray-600'
      ),
      ghost: cn(
        'bg-transparent text-blue-500',
        'active:bg-gray-100',
        'disabled:text-gray-400',
        'dark:text-blue-400',
        'dark:active:bg-gray-800',
        'dark:disabled:text-gray-600'
      ),
      destructive: cn(
        'bg-red-500 text-white',
        'active:bg-red-600',
        'disabled:bg-gray-300 disabled:text-gray-500'
      )
    }
    
    // Size styles
    const sizeStyles = {
      sm: 'h-8 px-3 text-sm rounded-lg',
      md: 'h-11 px-4 text-base rounded-xl',
      lg: 'h-14 px-6 text-lg rounded-2xl'
    }
    
    // Handle click with haptic feedback
    const handleClick = haptic !== false && onClick
      ? createHapticHandler(onClick, haptic)
      : onClick
    
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center',
          'font-medium transition-all duration-150',
          'touch-manipulation select-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          
          // iOS-specific styles
          'min-h-[44px]', // Apple's minimum touch target
          '-webkit-tap-highlight-color-transparent',
          
          // Size
          sizeStyles[size],
          
          // Variant
          variantStyles[variant],
          
          // Full width
          fullWidth && 'w-full',
          
          className
        )}
        onClick={handleClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

IOSButton.displayName = 'IOSButton'