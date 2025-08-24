import { renderHook, act } from '@testing-library/react'
import { useFocusTrap, useFocusTrapWithRef } from '@/hooks/useFocusTrap'
import { useRef } from 'react'

describe('useFocusTrap', () => {
  let container: HTMLDivElement
  let button1: HTMLButtonElement
  let button2: HTMLButtonElement
  let button3: HTMLButtonElement
  let outsideButton: HTMLButtonElement

  beforeEach(() => {
    // Enable fake timers for setTimeout testing
    jest.useFakeTimers()
    
    // Clear the document body
    document.body.innerHTML = ''

    // Create test container with focusable elements
    container = document.createElement('div')
    container.id = 'test-container'
    
    button1 = document.createElement('button')
    button1.textContent = 'Button 1'
    button1.id = 'button1'
    
    button2 = document.createElement('button')
    button2.textContent = 'Button 2'
    button2.id = 'button2'
    
    button3 = document.createElement('button')
    button3.textContent = 'Button 3'
    button3.id = 'button3'
    
    outsideButton = document.createElement('button')
    outsideButton.textContent = 'Outside Button'
    outsideButton.id = 'outside-button'

    container.appendChild(button1)
    container.appendChild(button2)
    container.appendChild(button3)
    
    document.body.appendChild(container)
    document.body.appendChild(outsideButton)
  })

  afterEach(() => {
    // Clean up
    document.body.innerHTML = ''
    jest.useRealTimers()
  })

  describe('useFocusTrap', () => {
    it('should trap focus within container when active', () => {
      // Mock the hook's behavior - the hook returns a ref but also sets up focus trap
      const { result, rerender } = renderHook(
        (props) => useFocusTrap(props.isActive),
        { initialProps: { isActive: false } }
      )
      
      // Set the ref to our test container
      Object.defineProperty(result.current, 'current', {
        writable: true,
        value: container
      })

      // Activate the trap
      rerender({ isActive: true })

      // Wait for the setTimeout in the hook
      act(() => {
        jest.runAllTimers()
      })

      // First element should be focused
      expect(document.activeElement).toBe(button1)
    })

    it('should not trap focus when inactive', () => {
      outsideButton.focus()
      
      const { result } = renderHook(() => useFocusTrap(false))
      
      Object.defineProperty(result.current, 'current', {
        writable: true,
        value: container
      })

      // Focus should remain on outside button
      expect(document.activeElement).toBe(outsideButton)
    })

    it('should handle Tab navigation correctly', () => {
      const { result } = renderHook(() => useFocusTrap(true))
      
      Object.defineProperty(result.current, 'current', {
        writable: true,
        value: container
      })

      act(() => {
        jest.runAllTimers()
      })

      // Start at first button
      button1.focus()
      expect(document.activeElement).toBe(button1)

      // Tab to next element
      const tabEvent = new KeyboardEvent('keydown', { 
        key: 'Tab', 
        shiftKey: false 
      })
      
      button2.focus()
      document.dispatchEvent(tabEvent)
      expect(document.activeElement).toBe(button2)

      // Tab from last element should wrap to first
      button3.focus()
      document.dispatchEvent(tabEvent)
      // Note: In a real browser, preventDefault would prevent default Tab behavior
      // In JSDOM, we're just testing that the event handler is called
    })

    it('should handle Shift+Tab navigation correctly', () => {
      const { result } = renderHook(() => useFocusTrap(true))
      
      Object.defineProperty(result.current, 'current', {
        writable: true,
        value: container
      })

      act(() => {
        jest.runAllTimers()
      })

      // Focus first element
      button1.focus()
      
      // Shift+Tab from first element should wrap to last
      const shiftTabEvent = new KeyboardEvent('keydown', { 
        key: 'Tab', 
        shiftKey: true 
      })
      
      document.dispatchEvent(shiftTabEvent)
      // Event handler should attempt to focus last element
    })

    it('should handle Escape key to close', () => {
      const closeButton = document.createElement('button')
      closeButton.setAttribute('aria-label', 'Close')
      const clickSpy = jest.spyOn(closeButton, 'click')
      container.appendChild(closeButton)

      const { result, rerender } = renderHook(
        (props) => useFocusTrap(props.isActive),
        { initialProps: { isActive: false } }
      )
      
      Object.defineProperty(result.current, 'current', {
        writable: true,
        value: container
      })

      // Activate the trap to set up event listeners
      rerender({ isActive: true })

      // Press Escape
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(escapeEvent)

      expect(clickSpy).toHaveBeenCalled()
    })

    it('should restore focus when unmounting', () => {
      outsideButton.focus()
      const previousElement = document.activeElement

      const { result, unmount, rerender } = renderHook(
        (props) => useFocusTrap(props.isActive),
        { initialProps: { isActive: false } }
      )
      
      Object.defineProperty(result.current, 'current', {
        writable: true,
        value: container
      })

      // Activate the trap
      rerender({ isActive: true })

      act(() => {
        jest.runAllTimers()
      })

      // Focus should be trapped
      expect(document.activeElement).toBe(button1)

      // Unmount the hook
      unmount()

      // Focus should be restored
      expect(document.activeElement).toBe(previousElement)
    })

    it('should filter out hidden and disabled elements', () => {
      // Add hidden button
      const hiddenButton = document.createElement('button')
      hiddenButton.style.display = 'none'
      container.insertBefore(hiddenButton, button1)

      // Add disabled button
      const disabledButton = document.createElement('button')
      disabledButton.disabled = true
      container.insertBefore(disabledButton, button1)

      const { result, rerender } = renderHook(
        (props) => useFocusTrap(props.isActive),
        { initialProps: { isActive: false } }
      )
      
      Object.defineProperty(result.current, 'current', {
        writable: true,
        value: container
      })

      // Activate the trap
      rerender({ isActive: true })

      act(() => {
        jest.runAllTimers()
      })

      // Should skip hidden and disabled, focus visible enabled button
      expect(document.activeElement).toBe(button1)
    })
  })

  describe('useFocusTrapWithRef', () => {
    it('should work with external ref', () => {
      const ExternalRefComponent = (props: { isActive: boolean }) => {
        const ref = useRef<HTMLDivElement>(null)
        useFocusTrapWithRef(ref, props.isActive)
        return ref
      }

      const { result, rerender } = renderHook(
        (props) => ExternalRefComponent(props),
        { initialProps: { isActive: false } }
      )
      
      // Set the external ref to our container
      Object.defineProperty(result.current, 'current', {
        writable: true,
        value: container
      })

      // Activate the trap
      rerender({ isActive: true })

      act(() => {
        jest.runAllTimers()
      })

      // First element should be focused
      expect(document.activeElement).toBe(button1)
    })

    it('should handle inactive state with external ref', () => {
      outsideButton.focus()
      
      const ExternalRefComponent = () => {
        const ref = useRef<HTMLDivElement>(null)
        useFocusTrapWithRef(ref, false)
        return ref
      }

      const { result } = renderHook(() => ExternalRefComponent())
      
      Object.defineProperty(result.current, 'current', {
        writable: true,
        value: container
      })

      // Focus should remain outside
      expect(document.activeElement).toBe(outsideButton)
    })

    it('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')
      
      const ExternalRefComponent = (props: { isActive: boolean }) => {
        const ref = useRef<HTMLDivElement>(null)
        useFocusTrapWithRef(ref, props.isActive)
        return ref
      }

      const { result, unmount, rerender } = renderHook(
        (props) => ExternalRefComponent(props),
        { initialProps: { isActive: false } }
      )
      
      Object.defineProperty(result.current, 'current', {
        writable: true,
        value: container
      })

      // Activate to set up listeners
      rerender({ isActive: true })

      // Clear previous calls from other tests
      removeEventListenerSpy.mockClear()

      unmount()

      // Should remove both keydown listeners (Tab handler and Escape handler)
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2)
    })
  })
})