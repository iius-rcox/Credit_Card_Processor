<template>
  <div 
    class="notification-container fixed top-4 right-4 z-50 space-y-2" 
    role="alert" 
    aria-live="polite"
    aria-label="Notification messages"
  >
    <TransitionGroup name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'notification-item max-w-md p-4 rounded-lg shadow-lg border-l-4 flex items-start space-x-3',
          getNotificationClasses(notification.type)
        ]"
        role="alert"
        :aria-labelledby="`notification-${notification.id}-title`"
        :aria-describedby="`notification-${notification.id}-message`"
      >
        <!-- Icon -->
        <div class="flex-shrink-0">
          <!-- Success Icon -->
          <svg v-if="notification.type === 'success'" class="h-5 w-5 text-success-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.25a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
          <!-- Error Icon -->
          <svg v-else-if="notification.type === 'error'" class="h-5 w-5 text-error-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
          </svg>
          <!-- Warning Icon -->
          <svg v-else-if="notification.type === 'warning'" class="h-5 w-5 text-warning-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
          </svg>
          <!-- Info Icon (default) -->
          <svg v-else class="h-5 w-5 text-info-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <h4 
            v-if="notification.title"
            :id="`notification-${notification.id}-title`"
            class="text-sm font-medium"
          >
            {{ notification.title }}
          </h4>
          <p 
            :id="`notification-${notification.id}-message`"
            class="text-sm mt-1"
            :class="{ 'mt-0': !notification.title }"
          >
            {{ notification.message }}
          </p>
          
          <!-- Action buttons -->
          <div v-if="notification.actions" class="mt-2 flex space-x-2">
            <button
              v-for="action in notification.actions"
              :key="action.label"
              type="button"
              class="text-xs font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded"
              @click="handleAction(action, notification)"
              :aria-label="`${action.label} for ${notification.title || 'notification'}`"
            >
              {{ action.label }}
            </button>
          </div>
        </div>

        <!-- Dismiss button -->
        <button
          v-if="notification.dismissible !== false"
          type="button"
          class="flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          @click="dismissNotification(notification.id)"
          :aria-label="`Dismiss ${notification.title || 'notification'}`"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </TransitionGroup>

    <!-- Screen reader announcements -->
    <div 
      class="sr-only" 
      aria-live="assertive" 
      aria-atomic="true"
    >
      {{ lastAnnouncedMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNotificationStore } from '@/stores/notification.js'
// Removed @heroicons import - using inline SVG icons instead

const notificationStore = useNotificationStore()
const lastAnnouncedMessage = ref('')

const notifications = computed(() => notificationStore.notifications)

// Watch for new notifications to announce them
watch(notifications, (newNotifications, oldNotifications) => {
  if (newNotifications.length > (oldNotifications?.length || 0)) {
    const latestNotification = newNotifications[newNotifications.length - 1]
    lastAnnouncedMessage.value = `${latestNotification.type} notification: ${latestNotification.title || ''} ${latestNotification.message}`
  }
}, { deep: true })

/**
 * Get CSS classes for notification type
 */
function getNotificationClasses(type) {
  const classes = {
    success: 'bg-success-50 border-success-500 text-success-800',
    error: 'bg-error-50 border-error-500 text-error-800',
    warning: 'bg-warning-50 border-warning-500 text-warning-800',
    info: 'bg-info-50 border-info-500 text-info-800'
  }
  return classes[type] || classes.info
}

// Removed getIconComponent function - using inline SVG icons instead

/**
 * Handle notification action clicks
 */
function handleAction(action, notification) {
  if (action.handler) {
    action.handler(notification)
  }
  
  if (action.dismiss !== false) {
    dismissNotification(notification.id)
  }
}

/**
 * Dismiss a notification
 */
function dismissNotification(notificationId) {
  notificationStore.removeNotification(notificationId)
}
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>