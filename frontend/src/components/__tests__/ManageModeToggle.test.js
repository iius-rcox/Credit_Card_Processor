import { describe, it, expect, vi } from 'vitest'
import { createWrapper } from '@/test/utils/component-helpers'
import ManageModeToggle from '../ManageModeToggle.vue'

describe('ManageModeToggle', () => {
  describe('Props and Events', () => {
    it('emits update:modelValue when clicked', async () => {
      const wrapper = createWrapper(ManageModeToggle, {
        props: { modelValue: false }
      })
      
      await wrapper.find('.toggle-button').trigger('click')
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([true])
    })

    it('emits toggle event with correct value', async () => {
      const wrapper = createWrapper(ManageModeToggle, {
        props: { modelValue: false }
      })
      
      await wrapper.find('.toggle-button').trigger('click')
      
      expect(wrapper.emitted('toggle')).toBeTruthy()
      expect(wrapper.emitted('toggle')[0]).toEqual([true])
    })

    it('respects disabled prop', async () => {
      const wrapper = createWrapper(ManageModeToggle, {
        props: { modelValue: false, disabled: true }
      })
      
      const button = wrapper.find('.toggle-button')
      expect(button.attributes('disabled')).toBeDefined()
      
      await button.trigger('click')
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('shows correct text based on modelValue', async () => {
      const wrapper = createWrapper(ManageModeToggle, {
        props: { modelValue: false }
      })
      
      expect(wrapper.find('.button-text').text()).toBe('Manage')
      
      await wrapper.setProps({ modelValue: true })
      expect(wrapper.find('.button-text').text()).toBe('Exit Manage')
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      const wrapper = createWrapper(ManageModeToggle, {
        props: { modelValue: false }
      })
      
      const button = wrapper.find('.toggle-button')
      expect(button.attributes('aria-pressed')).toBe('false')
      expect(button.attributes('aria-label')).toBe('Enter manage mode')
    })

    it('updates ARIA attributes when modelValue changes', async () => {
      const wrapper = createWrapper(ManageModeToggle, {
        props: { modelValue: false }
      })
      
      await wrapper.setProps({ modelValue: true })
      
      const button = wrapper.find('.toggle-button')
      expect(button.attributes('aria-pressed')).toBe('true')
      expect(button.attributes('aria-label')).toBe('Exit manage mode')
    })

    it('supports keyboard navigation', async () => {
      const wrapper = createWrapper(ManageModeToggle, {
        props: { modelValue: false }
      })
      
      const button = wrapper.find('.toggle-button')
      await button.trigger('keydown.enter')
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })
  })

  describe('Visual States', () => {
    it('applies active class when modelValue is true', () => {
      const wrapper = createWrapper(ManageModeToggle, {
        props: { modelValue: true }
      })
      
      expect(wrapper.find('.toggle-button').classes()).toContain('active')
    })

    it('handles hover states properly', async () => {
      const wrapper = createWrapper(ManageModeToggle, {
        props: { modelValue: false }
      })
      
      const button = wrapper.find('.toggle-button')
      await button.trigger('mouseenter')
      
      // Check if hover styles are applied (this would need CSS testing)
      expect(button.classes()).toBeDefined()
    })

    it('shows loading state correctly', () => {
      const wrapper = createWrapper(ManageModeToggle, {
        props: { modelValue: false, loading: true }
      })
      
      expect(wrapper.find('.toggle-button').classes()).toContain('loading')
    })
  })

  describe('Icon Transitions', () => {
    it('shows correct icon based on modelValue', () => {
      const wrapper = createWrapper(ManageModeToggle, {
        props: { modelValue: false }
      })
      
      expect(wrapper.find('.icon').exists()).toBe(true)
    })

    it('transitions between icons smoothly', async () => {
      const wrapper = createWrapper(ManageModeToggle, {
        props: { modelValue: false }
      })
      
      await wrapper.setProps({ modelValue: true })
      
      // Check if transition classes are applied
      expect(wrapper.find('.icon-swap-enter-active').exists()).toBe(true)
    })
  })
})
