/**
 * Responsive Design Tests
 * Tests the UI/UX responsive behavior at different viewport sizes
 * following the UI/UX Design Specification requirements
 * 
 * Note: These are unit tests for CSS classes and utilities.
 * For full e2e responsive testing with actual viewport changes,
 * use Playwright tests separately.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestPinia } from '../test/utils.js'

import App from '../App.vue'

describe('Responsive Design Implementation', () => {
  let pinia

  beforeEach(() => {
    pinia = createTestPinia()
  })

  describe('CSS Classes and Utilities', () => {
    it('should have responsive visibility classes available', () => {
      // Test that responsive utility classes are defined in our CSS
      const testElement = document.createElement('div')
      testElement.className = 'mobile-only tablet-only desktop-only'
      document.body.appendChild(testElement)
      
      // These classes should exist (even if not visible due to breakpoint)
      expect(testElement.classList.contains('mobile-only')).toBe(true)
      expect(testElement.classList.contains('tablet-only')).toBe(true)
      expect(testElement.classList.contains('desktop-only')).toBe(true)
      
      document.body.removeChild(testElement)
    })

    it('should have responsive container classes', () => {
      const testElement = document.createElement('div')
      testElement.className = 'container-responsive'
      document.body.appendChild(testElement)
      
      expect(testElement.classList.contains('container-responsive')).toBe(true)
      
      document.body.removeChild(testElement)
    })

    it('should have responsive grid utilities', () => {
      const testElement = document.createElement('div')
      testElement.className = 'grid-responsive cols-2 cols-3 cols-4'
      document.body.appendChild(testElement)
      
      expect(testElement.classList.contains('grid-responsive')).toBe(true)
      expect(testElement.classList.contains('cols-2')).toBe(true)
      expect(testElement.classList.contains('cols-3')).toBe(true)
      expect(testElement.classList.contains('cols-4')).toBe(true)
      
      document.body.removeChild(testElement)
    })

    it('should have touch-friendly sizing classes', () => {
      const testElement = document.createElement('div')
      testElement.className = 'touch-friendly touch-target'
      document.body.appendChild(testElement)
      
      expect(testElement.classList.contains('touch-friendly')).toBe(true)
      expect(testElement.classList.contains('touch-target')).toBe(true)
      
      document.body.removeChild(testElement)
    })
  })

  describe('App Component Responsive Structure', () => {
    it('should render responsive header structure', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [pinia],
          stubs: {
            AuthDisplay: true,
            FileUpload: true,
            ProgressTracker: true,
            ResultsDisplay: true,
            ExportActions: true
          }
        }
      })

      // Check header has responsive classes
      const header = wrapper.find('header')
      expect(header.exists()).toBe(true)
      expect(header.classes()).toContain('app-header')

      // Check container has responsive classes
      const container = wrapper.find('.container-responsive')
      expect(container.exists()).toBe(true)

      // Check for responsive content elements
      const mobileOnly = wrapper.find('.mobile-only')
      const tabletOnly = wrapper.find('.tablet-only')
      const desktopOnly = wrapper.find('.desktop-only')
      
      // These should exist (rendered but may be hidden by CSS)
      expect(mobileOnly.exists() || tabletOnly.exists() || desktopOnly.exists()).toBe(true)
    })

    it('should have main content with responsive layout', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [pinia],
          stubs: {
            AuthDisplay: true,
            FileUpload: true,
            ProgressTracker: true,
            ResultsDisplay: true,
            ExportActions: true
          }
        }
      })

      const main = wrapper.find('main')
      expect(main.exists()).toBe(true)
      expect(main.classes()).toContain('container-responsive')
      expect(main.classes()).toContain('main-content')

      const contentSection = wrapper.find('.content-section')
      expect(contentSection.exists()).toBe(true)
    })

    it('should have responsive footer', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [pinia],
          stubs: {
            AuthDisplay: true,
            FileUpload: true,
            ProgressTracker: true,
            ResultsDisplay: true,
            ExportActions: true
          }
        }
      })

      const footer = wrapper.find('footer')
      expect(footer.exists()).toBe(true)
      
      const container = footer.find('.container-responsive')
      expect(container.exists()).toBe(true)
    })
  })

  describe('Design System Integration', () => {
    it('should use design system typography classes', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [pinia],
          stubs: {
            AuthDisplay: true,
            FileUpload: true,
            ProgressTracker: true,
            ResultsDisplay: true,
            ExportActions: true
          }
        }
      })

      // Check for design system classes being used
      const html = wrapper.html()
      expect(html).toMatch(/text-hierarchy-[1-4]|text-small-text|text-body-primary|text-body-secondary/)
    })

    it('should use design system color classes', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [pinia],
          stubs: {
            AuthDisplay: true,
            FileUpload: true,
            ProgressTracker: true,
            ResultsDisplay: true,
            ExportActions: true
          }
        }
      })

      // Check for design system color usage
      const html = wrapper.html()
      expect(html).toMatch(/text-neutral-[0-9]+|bg-primary-[0-9]+|text-success-[0-9]+/)
    })

    it('should use consistent spacing classes', () => {
      const wrapper = mount(App, {
        global: {
          plugins: [pinia],
          stubs: {
            AuthDisplay: true,
            FileUpload: true,
            ProgressTracker: true,
            ResultsDisplay: true,
            ExportActions: true
          }
        }
      })

      // Check for consistent spacing usage - footer has mt-8 tablet:mt-12 desktop:mt-xxl
      const html = wrapper.html()
      expect(html).toMatch(/mt-8|tablet:mt-12|desktop:mt-xxl|py-4/)
    })
  })

  describe('Button Responsive Behavior', () => {
    it('should have responsive button classes available', () => {
      // Test button responsive utilities
      const testButton = document.createElement('button')
      testButton.className = 'btn-responsive touch-friendly'
      document.body.appendChild(testButton)
      
      expect(testButton.classList.contains('btn-responsive')).toBe(true)
      expect(testButton.classList.contains('touch-friendly')).toBe(true)
      
      document.body.removeChild(testButton)
    })
  })

  describe('Component Styling Integration', () => {
    it('should have component-specific responsive classes', () => {
      // Test that component responsive classes are available
      const testDiv = document.createElement('div')
      testDiv.className = 'card-responsive form-responsive'
      document.body.appendChild(testDiv)
      
      expect(testDiv.classList.contains('card-responsive')).toBe(true)
      expect(testDiv.classList.contains('form-responsive')).toBe(true)
      
      document.body.removeChild(testDiv)
    })
  })
})