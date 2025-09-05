import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/main.css'
import './styles/components.css'

// Global error handling for JavaScript errors
window.addEventListener('error', (event) => {
  console.error('Global JavaScript Error:', {
    message: event.error?.message || event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
    timestamp: new Date().toISOString()
  })
  
  // Log specific error patterns we've fixed
  if (event.error?.message?.includes('some is not a function')) {
    console.error('CRITICAL: Array.some() error detected - this should be fixed!', {
      error: event.error,
      context: 'Global error handler caught .some() issue'
    })
  }
})

// Global unhandled promise rejection handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise,
    timestamp: new Date().toISOString()
  })
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
