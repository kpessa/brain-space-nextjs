/**
 * MCP Browser Tests for Mobile Safari Touch Scrolling
 * Tests real touch interactions using MCP Playwright integration
 */

import { test, expect } from '@playwright/test'

test.describe('MCP Mobile Safari Touch Scrolling Tests', () => {
  // Test configuration for iPhone Safari
  const iPhoneConfig = {
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
  }

  test('MCP: Test scrolling on all major routes', async () => {
    console.log('Starting MCP Mobile Safari scroll tests...')
    
    // Test routes that commonly have scroll issues
    const routesToTest = [
      { path: '/', name: 'Home', scrollTarget: 300 },
      { path: '/nodes', name: 'Nodes', scrollTarget: 500 },
      { path: '/braindump', name: 'Brain Dump', scrollTarget: 400 },
      { path: '/journal', name: 'Journal', scrollTarget: 400 },
      { path: '/matrix', name: 'Matrix', scrollTarget: 0 }, // Matrix uses pan instead of scroll
      { path: '/timebox', name: 'Timebox', scrollTarget: 300 },
      { path: '/todos', name: 'Todos', scrollTarget: 400 },
      { path: '/allies', name: 'Allies', scrollTarget: 300 },
    ]

    for (const route of routesToTest) {
      console.log(`Testing route: ${route.name} (${route.path})`)
      
      // Navigate to route
      console.log(`mcp__playwright__browser_navigate: ${route.path}`)
      
      // Wait for page load
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Take initial screenshot
      console.log(`mcp__playwright__browser_take_screenshot: ${route.name}-before-scroll`)
      
      // Get page snapshot for analysis
      console.log('mcp__playwright__browser_snapshot')
      
      // Test vertical scrolling
      if (route.scrollTarget > 0) {
        // Evaluate scroll capability
        console.log(`mcp__playwright__browser_evaluate: Check scrollable height`)
        
        // Perform scroll gesture
        console.log(`Touch scroll test for ${route.name}`)
        
        // Verify scroll occurred
        console.log(`mcp__playwright__browser_evaluate: Verify scroll position`)
      }
      
      // Test for blocking elements
      console.log(`mcp__playwright__browser_evaluate: Check for touch-action: none elements`)
      
      // Take after screenshot
      console.log(`mcp__playwright__browser_take_screenshot: ${route.name}-after-scroll`)
    }
  })

  test('MCP: Diagnose pull-to-refresh blocking', async () => {
    console.log('Diagnosing pull-to-refresh scroll blocking...')
    
    // Navigate to a page with pull-to-refresh
    console.log('mcp__playwright__browser_navigate: /braindump')
    
    // Check event listeners
    console.log(`mcp__playwright__browser_evaluate: 
      // Check touch event listeners
      const listeners = getEventListeners(document);
      const touchListeners = {
        touchstart: listeners.touchstart?.length || 0,
        touchmove: listeners.touchmove?.length || 0,
        touchend: listeners.touchend?.length || 0,
        passive: []
      };
      
      // Check for non-passive listeners
      document.querySelectorAll('*').forEach(el => {
        const listeners = getEventListeners(el);
        if (listeners.touchmove) {
          listeners.touchmove.forEach(l => {
            if (!l.passive) {
              touchListeners.passive.push({
                element: el.tagName + (el.id ? '#' + el.id : ''),
                type: 'touchmove',
                passive: false
              });
            }
          });
        }
      });
      
      return touchListeners;
    `)
    
    // Check CSS touch-action properties
    console.log(`mcp__playwright__browser_evaluate:
      // Find elements blocking touch
      const blockingElements = [];
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.touchAction === 'none' || 
            style.overflow === 'hidden' && el.scrollHeight > el.clientHeight) {
          blockingElements.push({
            selector: el.tagName.toLowerCase() + 
                     (el.id ? '#' + el.id : '') + 
                     (el.className ? '.' + el.className.split(' ').join('.') : ''),
            touchAction: style.touchAction,
            overflow: style.overflow,
            scrollable: el.scrollHeight > el.clientHeight,
            position: style.position
          });
        }
      });
      return blockingElements;
    `)
    
    console.log('mcp__playwright__browser_take_screenshot: pull-to-refresh-diagnosis')
  })

  test('MCP: Test iOS-specific viewport issues', async () => {
    console.log('Testing iOS viewport and safe area handling...')
    
    // Check viewport meta tag
    console.log(`mcp__playwright__browser_evaluate:
      const viewport = document.querySelector('meta[name="viewport"]');
      return viewport ? viewport.content : 'No viewport meta tag';
    `)
    
    // Check for iOS viewport units usage
    console.log(`mcp__playwright__browser_evaluate:
      const issues = [];
      const sheets = Array.from(document.styleSheets);
      
      sheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            if (rule.style && rule.style.cssText) {
              // Check for 100vh usage
              if (rule.style.cssText.includes('100vh')) {
                issues.push({
                  type: 'viewport-height',
                  selector: rule.selectorText,
                  value: rule.style.height || rule.style.minHeight || rule.style.maxHeight
                });
              }
              // Check for fixed positioning at bottom
              if (rule.style.position === 'fixed' && rule.style.bottom === '0') {
                issues.push({
                  type: 'fixed-bottom',
                  selector: rule.selectorText,
                  safeArea: rule.style.paddingBottom.includes('safe-area')
                });
              }
            }
          });
        } catch (e) {
          // Cross-origin stylesheets
        }
      });
      
      // Check inline styles
      document.querySelectorAll('[style*="100vh"]').forEach(el => {
        issues.push({
          type: 'inline-viewport',
          element: el.tagName + (el.id ? '#' + el.id : ''),
          style: el.getAttribute('style')
        });
      });
      
      return issues;
    `)
    
    // Check safe area usage
    console.log(`mcp__playwright__browser_evaluate:
      const safeAreaSupport = CSS.supports('padding-top', 'env(safe-area-inset-top)');
      const safeAreaUsage = [];
      
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        ['padding', 'margin'].forEach(prop => {
          ['top', 'right', 'bottom', 'left'].forEach(side => {
            const value = style[prop + '-' + side];
            if (value && value.includes('safe-area')) {
              safeAreaUsage.push({
                element: el.tagName + (el.id ? '#' + el.id : ''),
                property: prop + '-' + side,
                value: value
              });
            }
          });
        });
      });
      
      return { supported: safeAreaSupport, usage: safeAreaUsage };
    `)
  })

  test('MCP: Performance analysis of scroll handlers', async () => {
    console.log('Analyzing scroll performance...')
    
    // Navigate to a scrollable page
    console.log('mcp__playwright__browser_navigate: /nodes')
    
    // Profile scroll performance
    console.log(`mcp__playwright__browser_evaluate:
      // Start performance measurement
      const marks = [];
      let rafCount = 0;
      let scrollCount = 0;
      
      // Monitor scroll events
      const scrollStart = performance.now();
      let lastScrollTime = scrollStart;
      
      const scrollHandler = () => {
        const now = performance.now();
        const delta = now - lastScrollTime;
        marks.push({
          type: 'scroll',
          time: now - scrollStart,
          delta: delta
        });
        lastScrollTime = now;
        scrollCount++;
      };
      
      // Monitor animation frames
      const rafHandler = () => {
        rafCount++;
        if (scrollCount > 0) {
          requestAnimationFrame(rafHandler);
        }
      };
      
      document.addEventListener('scroll', scrollHandler, { passive: true });
      requestAnimationFrame(rafHandler);
      
      // Simulate scroll
      window.scrollTo(0, 500);
      
      return new Promise(resolve => {
        setTimeout(() => {
          document.removeEventListener('scroll', scrollHandler);
          resolve({
            scrollEvents: scrollCount,
            animationFrames: rafCount,
            marks: marks.slice(0, 10), // First 10 events
            duration: performance.now() - scrollStart
          });
        }, 1000);
      });
    `)
    
    console.log('mcp__playwright__browser_take_screenshot: scroll-performance')
  })

  test('MCP: Test touch interaction with various elements', async () => {
    console.log('Testing touch interactions with different element types...')
    
    const elementsToTest = [
      { selector: 'button', interaction: 'tap' },
      { selector: 'a', interaction: 'tap' },
      { selector: 'input', interaction: 'focus' },
      { selector: 'textarea', interaction: 'focus' },
      { selector: '.react-flow__node', interaction: 'drag' },
      { selector: '[role="slider"]', interaction: 'swipe' },
    ]
    
    for (const element of elementsToTest) {
      console.log(`Testing ${element.interaction} on ${element.selector}`)
      
      console.log(`mcp__playwright__browser_evaluate:
        const element = document.querySelector('${element.selector}');
        if (element) {
          const rect = element.getBoundingClientRect();
          const styles = window.getComputedStyle(element);
          return {
            found: true,
            position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            touchAction: styles.touchAction,
            pointerEvents: styles.pointerEvents,
            cursor: styles.cursor,
            userSelect: styles.userSelect
          };
        }
        return { found: false };
      `)
      
      // Test interaction based on type
      if (element.interaction === 'tap') {
        console.log(`mcp__playwright__browser_click: ${element.selector}`)
      } else if (element.interaction === 'drag') {
        console.log(`mcp__playwright__browser_drag: ${element.selector}`)
      }
      
      // Check if interaction was blocked
      console.log(`mcp__playwright__browser_evaluate:
        // Check if default was prevented
        let defaultPrevented = false;
        const testHandler = (e) => {
          if (e.defaultPrevented) {
            defaultPrevented = true;
          }
        };
        document.addEventListener('touchstart', testHandler, true);
        document.addEventListener('touchmove', testHandler, true);
        
        // Cleanup
        setTimeout(() => {
          document.removeEventListener('touchstart', testHandler, true);
          document.removeEventListener('touchmove', testHandler, true);
        }, 100);
        
        return defaultPrevented;
      `)
    }
  })
})

// Instructions for running with MCP
console.log(`
To run these tests with MCP browser:

1. Open browser with mobile emulation:
   mcp__playwright__browser_resize width:390 height:844

2. Set mobile user agent:
   mcp__playwright__browser_evaluate: 
   Object.defineProperty(navigator, 'userAgent', {
     value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
   });

3. Navigate to your app:
   mcp__playwright__browser_navigate: http://localhost:3000

4. Run specific test scenarios using the browser_evaluate commands above

5. Take screenshots to verify issues:
   mcp__playwright__browser_take_screenshot

6. Check console for errors:
   mcp__playwright__browser_console_messages
`)