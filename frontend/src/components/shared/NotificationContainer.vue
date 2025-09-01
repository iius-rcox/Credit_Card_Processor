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
          <component 
            :is="getIconComponent(notification.type)" 
            class="h-5 w-5" 
            :aria-hidden="true"
          />
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
          <XMarkIcon class="h-4 w-4" aria-hidden="true" />
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
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/vue/24/solid'

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

/**
 * Get icon component for notification type
 */
function getIconComponent(type) {
  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
  }
  return icons[type] || InformationCircleIcon
}

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