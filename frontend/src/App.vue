<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">
              Credit Card Processor
            </h1>
          </div>
          <div class="flex items-center space-x-4">
            <div v-if="sessionStore.hasSession" class="text-sm text-gray-600">
              Session: {{ sessionStore.sessionId }}
            </div>
            <div class="flex items-center space-x-2">
              <div
                :class="[
                  'w-3 h-3 rounded-full',
                  sessionStore.hasSession ? 'bg-success-500' : 'bg-gray-300',
                ]"
                :title="sessionStore.hasSession ? 'Connected' : 'No Session'"
              ></div>
              <span class="text-sm text-gray-600">
                {{ sessionStore.hasSession ? 'Connected' : 'Disconnected' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="space-y-8">
        <!-- Welcome Card -->
        <div class="card">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Credit Card Processor
            </h2>
            <p class="text-gray-600 mb-6">
              Upload your PDF documents to extract and process credit card data
              efficiently.
            </p>

            <!-- Status Display -->
            <div class="inline-flex items-center space-x-4 text-sm">
              <div class="flex items-center space-x-2">
                <span class="text-gray-500">Status:</span>
                <span
                  :class="getStatusColor(sessionStore.processingStatus)"
                  class="px-2 py-1 rounded-full text-xs font-medium capitalize"
                >
                  {{ sessionStore.processingStatus }}
                </span>
              </div>
              <div
                v-if="sessionStore.hasFiles"
                class="flex items-center space-x-2"
              >
                <span class="text-gray-500">Files:</span>
                <span class="text-gray-900 font-medium">
                  {{ sessionStore.uploadedFiles.length }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- File Upload Section -->
        <div class="card">
          <h3 class="text-lg font-medium text-gray-900 mb-4">File Upload</h3>
          <div
            class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
          >
            <div class="text-gray-500">
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <p class="mt-2 text-sm">Upload your PDF files here</p>
              <p class="text-xs text-gray-400 mt-1">
                Supported formats: PDF (max 10MB per file)
              </p>
            </div>
          </div>
        </div>

        <!-- Processing Status -->
        <div v-if="sessionStore.isProcessing" class="card">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Processing Status
          </h3>
          <div class="space-y-4">
            <div class="progress-bar">
              <div class="progress-fill" style="width: 45%"></div>
            </div>
            <p class="text-sm text-gray-600 text-center">
              Processing documents... Please wait.
            </p>
          </div>
        </div>

        <!-- Results Section -->
        <div v-if="sessionStore.hasResults" class="card">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Processing Results
          </h3>
          <div class="text-center text-gray-600">
            <p>Results will be displayed here once processing is complete.</p>
          </div>
        </div>

        <!-- Error Display -->
        <div
          v-if="sessionStore.hasError"
          class="card border-error-200 bg-error-50"
        >
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <svg
                class="h-5 w-5 text-error-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h4 class="text-sm font-medium text-error-800">Error</h4>
              <p class="text-sm text-error-700 mt-1">
                {{ sessionStore.error }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 mt-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p class="text-center text-sm text-gray-500">
          Credit Card Processor v1.0.0 - Built with Vue 3, Vite & Tailwind CSS
        </p>
      </div>
    </footer>
  </div>
</template>

<script>
import { useSessionStore } from './stores/session.js'

export default {
  name: 'App',
  setup() {
    const sessionStore = useSessionStore()

    // Initialize a demo session on component mount
    if (!sessionStore.hasSession) {
      sessionStore.createSession(`demo-session-${Date.now()}`)
    }

    const getStatusColor = status => {
      const colors = {
        idle: 'bg-gray-100 text-gray-800',
        uploading: 'bg-primary-100 text-primary-800',
        processing: 'bg-warning-100 text-warning-800',
        completed: 'bg-success-100 text-success-800',
        error: 'bg-error-100 text-error-800',
      }
      return colors[status] || 'bg-gray-100 text-gray-800'
    }

    return {
      sessionStore,
      getStatusColor,
    }
  },
}
</script>
