<template>
  <div class="manage-mode-toggle">
    <button 
      class="toggle-button"
      :class="{ 'active': modelValue }"
      :aria-pressed="modelValue"
      :disabled="disabled"
      @click="handleToggle"
      :aria-label="modelValue ? 'Exit manage mode' : 'Enter manage mode'"
    >
      <transition name="icon-swap" mode="out-in">
        <CheckSquareIcon v-if="modelValue" key="manage" class="icon" />
        <ListIcon v-else key="view" class="icon" />
      </transition>
      <span class="button-text">{{ modelValue ? 'Exit Manage' : 'Manage' }}</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'ManageModeToggle',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'toggle'],
  methods: {
    handleToggle() {
      if (!this.disabled) {
        const newValue = !this.modelValue
        this.$emit('update:modelValue', newValue)
        this.$emit('toggle', newValue)
      }
    }
  }
}
</script>

<style scoped>
.manage-mode-toggle {
  display: inline-block;
}

.toggle-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  color: #333;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.toggle-button:hover:not(:disabled) {
  border-color: #007bff;
  background: #f8f9ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
}

.toggle-button.active {
  border-color: #007bff;
  background: #007bff;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.25);
}

.toggle-button.active:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.toggle-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.toggle-button:disabled:hover {
  border-color: #e0e0e0;
  background: white;
  color: #333;
}

.icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.button-text {
  white-space: nowrap;
}

/* Icon transition animations */
.icon-swap-enter-active,
.icon-swap-leave-active {
  transition: all 0.2s ease;
}

.icon-swap-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.8);
}

.icon-swap-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.8);
}

/* Focus styles for accessibility */
.toggle-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.toggle-button.active:focus {
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.5);
}

/* Loading state */
.toggle-button.loading {
  pointer-events: none;
}

.toggle-button.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive design */
@media (max-width: 768px) {
  .toggle-button {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .icon {
    width: 16px;
    height: 16px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .toggle-button {
    background: #2d2d2d;
    border-color: #444;
    color: #e0e0e0;
  }
  
  .toggle-button:hover:not(:disabled) {
    background: #3d3d3d;
    border-color: #007bff;
  }
  
  .toggle-button:disabled {
    background: #2d2d2d;
    color: #666;
  }
}
</style>




