<template>
  <div class="file-upload-enhanced">
    <!-- Hero Mode Header -->
    <div v-if="heroMode" class="text-center mb-8">
      <div class="mb-6">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-neutral-900 mb-3" id="upload-section-title">
          Upload Your Documents
        </h2>
        <p class="text-lg text-neutral-600 max-w-2xl mx-auto" id="upload-section-description">
          Upload both CAR and Receipt PDF files to get started. We'll automatically process them and provide detailed results.
        </p>
      </div>
      
      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-6">
        <div class="text-center">
          <div class="text-2xl font-bold text-primary-600">2</div>
          <div class="text-sm text-neutral-500">File Types</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-primary-600">300MB</div>
          <div class="text-sm text-neutral-500">Max Size</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-primary-600">PDF</div>
          <div class="text-sm text-neutral-500">Format</div>
        </div>
      </div>
    </div>

    <!-- Compact Mode Header -->
    <div v-else class="mb-6">
      <h3 class="text-xl font-semibold text-neutral-900 mb-2" id="upload-section-title">
        {{ sessionStore.hasFiles ? 'Upload Additional Files' : 'Upload Documents' }}
      </h3>
      <p class="text-sm text-neutral-600" id="upload-section-description">
        Upload both CAR and Receipt PDF files. Maximum sizes: CAR 100MB, Receipt 300MB.
      </p>
    </div>

    <!-- File Upload Grid -->
    <div 
      :class="[
        'grid gap-6 mb-6',
        heroMode ? 'md:grid-cols-2 lg:grid-cols-2' : 'md:grid-cols-2'
      ]"
    >
      <!-- CAR File Upload -->
      <div 
        :class="[
          'upload-card group relative overflow-hidden transition-all duration-300',
          heroMode 
            ? 'bg-white border-2 border-neutral-200 rounded-xl p-6 hover:border-primary-300 hover:shadow-lg' 
            : 'bg-neutral-50 border border-neutral-200 rounded-lg p-4 hover:bg-white hover:border-neutral-300'
        ]"
      >
        <div class="text-center">
          <h4 :class="[heroMode ? 'text-xl font-semibold mb-4' : 'text-lg font-medium mb-3']" class="text-neutral-900">
            CAR File
          </h4>

          <!-- Upload Zone -->
          <div
            :class="[
              'border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              heroMode ? 'p-8' : 'p-6',
              carDragActive
                ? 'border-primary-500 bg-primary-50'
                : carFile
                  ? 'border-success-500 bg-success-50'
                  : 'border-neutral-300 hover:border-primary-400 hover:bg-primary-25 group-hover:border-primary-400'
            ]"
            role="button"
            tabindex="0"
            :aria-labelledby="carFile ? 'car-file-selected' : 'car-upload-instructions'"
            :aria-describedby="carFile ? 'car-file-info' : 'car-upload-help'"
            @drop.prevent="handleCarDrop"
            @dragover.prevent="handleDragOver"
            @dragenter.prevent="carDragActive = true"
            @dragleave.prevent="carDragActive = false"
            @click="triggerCarInput"
            @keydown.enter="triggerCarInput"
            @keydown.space.prevent="triggerCarInput"
          >
            <input
              ref="carInput"
              type="file"
              accept=".pdf,application/pdf"
              class="sr-only"
              aria-labelledby="car-upload-title"
              aria-describedby="car-upload-help"
              @change="handleCarSelect"
            />

            <div v-if="!carFile" class="space-y-3">
              <svg
                :class="[heroMode ? 'h-16 w-16' : 'h-12 w-12']"
                class="mx-auto text-neutral-400 group-hover:text-primary-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div>
                <p 
                  :class="[heroMode ? 'text-base font-medium' : 'text-sm']"
                  class="text-neutral-700 group-hover:text-primary-700 transition-colors"
                  id="car-upload-instructions"
                >
                  {{ carDragActive ? 'Drop CAR file here' : 'Click to upload CAR PDF' }}
                </p>
                <p 
                  class="text-xs text-neutral-500 mt-1"
                  id="car-upload-help"
                >
                  Drag and drop or browse • Max 100MB
                </p>
              </div>
            </div>

            <!-- Selected File Display -->
            <div v-else class="space-y-3">
              <svg
                :class="[heroMode ? 'h-16 w-16' : 'h-12 w-12']"
                class="mx-auto text-success-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clip-rule="evenodd"
                />
              </svg>
              <div>
                <p 
                  :class="[heroMode ? 'text-base font-semibold' : 'text-sm font-medium']"
                  class="text-neutral-900"
                  id="car-file-selected"
                >
                  {{ carFile.name }}
                </p>
                <p 
                  class="text-xs text-neutral-500 mt-1"
                  id="car-file-info"
                >
                  {{ formatFileSize(carFile.size) }} • Ready to upload
                </p>
                <button
                  type="button"
                  @click.stop="removeCarFile"
                  class="inline-flex items-center px-2 py-1 mt-2 text-xs text-error-600 hover:text-error-800 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 rounded transition-colors"
                  :aria-label="`Remove CAR file ${carFile.name}`"
                >
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          </div>

          <!-- Upload Progress -->
          <div v-if="carUploadStatus" class="mt-4">
            <div class="flex items-center justify-between text-sm">
              <span :class="getStatusColor(carUploadStatus)">
                {{ getStatusText(carUploadStatus) }}
              </span>
              <span v-if="carUploadStatus === 'uploading'" class="text-neutral-600">
                {{ carProgress }}%
              </span>
            </div>
            <div
              v-if="carUploadStatus === 'uploading'"
              class="w-full bg-neutral-200 rounded-full h-2 mt-2"
            >
              <div
                class="bg-primary-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${carProgress}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Receipt File Upload -->
      <div 
        :class="[
          'upload-card group relative overflow-hidden transition-all duration-300',
          heroMode 
            ? 'bg-white border-2 border-neutral-200 rounded-xl p-6 hover:border-primary-300 hover:shadow-lg' 
            : 'bg-neutral-50 border border-neutral-200 rounded-lg p-4 hover:bg-white hover:border-neutral-300'
        ]"
      >
        <div class="text-center">
          <h4 :class="[heroMode ? 'text-xl font-semibold mb-4' : 'text-lg font-medium mb-3']" class="text-neutral-900">
            Receipt File
          </h4>

          <!-- Upload Zone -->
          <div
            :class="[
              'border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              heroMode ? 'p-8' : 'p-6',
              receiptDragActive
                ? 'border-primary-500 bg-primary-50'
                : receiptFile
                  ? 'border-success-500 bg-success-50'
                  : 'border-neutral-300 hover:border-primary-400 hover:bg-primary-25 group-hover:border-primary-400'
            ]"
            role="button"
            tabindex="0"
            @drop.prevent="handleReceiptDrop"
            @dragover.prevent="handleDragOver"
            @dragenter.prevent="receiptDragActive = true"
            @dragleave.prevent="receiptDragActive = false"
            @click="triggerReceiptInput"
            @keydown.enter="triggerReceiptInput"
            @keydown.space.prevent="triggerReceiptInput"
          >
            <input
              ref="receiptInput"
              type="file"
              accept=".pdf,application/pdf"
              class="sr-only"
              @change="handleReceiptSelect"
            />

            <div v-if="!receiptFile" class="space-y-3">
              <svg
                :class="[heroMode ? 'h-16 w-16' : 'h-12 w-12']"
                class="mx-auto text-neutral-400 group-hover:text-primary-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div>
                <p 
                  :class="[heroMode ? 'text-base font-medium' : 'text-sm']"
                  class="text-neutral-700 group-hover:text-primary-700 transition-colors"
                >
                  {{ receiptDragActive ? 'Drop Receipt file here' : 'Click to upload Receipt PDF' }}
                </p>
                <p class="text-xs text-neutral-500 mt-1">
                  Drag and drop or browse • Max 300MB
                </p>
              </div>
            </div>

            <!-- Selected File Display -->
            <div v-else class="space-y-3">
              <svg
                :class="[heroMode ? 'h-16 w-16' : 'h-12 w-12']"
                class="mx-auto text-success-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clip-rule="evenodd"
                />
              </svg>
              <div>
                <p 
                  :class="[heroMode ? 'text-base font-semibold' : 'text-sm font-medium']"
                  class="text-neutral-900"
                >
                  {{ receiptFile.name }}
                </p>
                <p class="text-xs text-neutral-500 mt-1">
                  {{ formatFileSize(receiptFile.size) }} • Ready to upload
                </p>
                <button
                  @click.stop="removeReceiptFile"
                  class="inline-flex items-center px-2 py-1 mt-2 text-xs text-error-600 hover:text-error-800 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 rounded transition-colors"
                >
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          </div>

          <!-- Upload Progress -->
          <div v-if="receiptUploadStatus" class="mt-4">
            <div class="flex items-center justify-between text-sm">
              <span :class="getStatusColor(receiptUploadStatus)">
                {{ getStatusText(receiptUploadStatus) }}
              </span>
              <span v-if="receiptUploadStatus === 'uploading'" class="text-neutral-600">
                {{ receiptProgress }}%
              </span>
            </div>
            <div
              v-if="receiptUploadStatus === 'uploading'"
              class="w-full bg-neutral-200 rounded-full h-2 mt-2"
            >
              <div
                class="bg-primary-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${receiptProgress}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Processing Options (Hero Mode) -->
    <div v-if="heroMode && hasFiles" class="bg-neutral-50 rounded-xl p-6 mb-6">
      <h4 class="text-lg font-medium text-neutral-900 mb-4 flex items-center">
        <svg class="w-5 h-5 mr-2 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        Processing Options
      </h4>
      
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <label class="flex items-start space-x-3">
          <input
            v-model="processingOptions.enableValidation"
            type="checkbox"
            class="mt-0.5 h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
          />
          <div>
            <div class="text-sm font-medium text-neutral-900">Data Validation</div>
            <div class="text-xs text-neutral-500">Verify data completeness</div>
          </div>
        </label>
        
        <label class="flex items-start space-x-3">
          <input
            v-model="processingOptions.enableAutoResolution"
            type="checkbox"
            class="mt-0.5 h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
          />
          <div>
            <div class="text-sm font-medium text-neutral-900">Auto Resolution</div>
            <div class="text-xs text-neutral-500">Fix common issues automatically</div>
          </div>
        </label>
        
        <label class="flex items-start space-x-3">
          <input
            v-model="processingOptions.enableEmailNotifications"
            type="checkbox"
            class="mt-0.5 h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
          />
          <div>
            <div class="text-sm font-medium text-neutral-900">Email Notifications</div>
            <div class="text-xs text-neutral-500">Get notified when complete</div>
          </div>
        </label>
      </div>
    </div>

    <!-- Action Section -->
    <div 
      :class="[
        'flex items-center justify-between p-6 rounded-xl',
        heroMode 
          ? 'bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200' 
          : 'bg-neutral-50 border border-neutral-200'
      ]"
    >
      <!-- Status Text -->
      <div class="flex-1">
        <div :class="[heroMode ? 'text-base font-medium' : 'text-sm']" class="text-neutral-900">
          {{ getUploadStatusText() }}
        </div>
        <div v-if="uploadCompleted" class="text-sm text-success-600 font-medium mt-1">
          ✓ Files uploaded successfully
        </div>
        <div v-else-if="isUploading" class="text-sm text-primary-600 mt-1">
          Upload progress: {{ Math.round((carProgress + receiptProgress) / 2) }}%
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-3">
        <button
          v-if="hasFiles && !isUploading"
          @click="clearFiles"
          class="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 rounded-lg"
        >
          Clear Files
        </button>

        <button
          v-if="!uploadCompleted"
          :disabled="!canUpload"
          :class="[
            'inline-flex items-center px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
            heroMode ? 'text-base px-8 py-4' : '',
            canUpload
              ? 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 transform hover:scale-105'
              : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
          ]"
          @click="uploadFiles"
          data-testid="upload-button"
        >
          <svg
            v-if="isUploading"
            class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <svg
            v-else-if="!isUploading && canUpload"
            class="-ml-1 mr-3 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          {{ isUploading ? 'Uploading...' : (heroMode ? 'Upload & Process Files' : 'Upload Files') }}
        </button>

        <button
          v-if="uploadCompleted"
          @click="startProcessing"
          :disabled="isProcessingStarted"
          :class="[
            'inline-flex items-center px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
            heroMode ? 'text-base px-8 py-4' : '',
            !isProcessingStarted
              ? 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 transform hover:scale-105'
              : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
          ]"
          data-testid="start-processing-button"
        >
          <svg
            v-if="isProcessingStarted"
            class="animate-spin -ml-1 mr-3 h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <svg
            v-else
            class="-ml-1 mr-3 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          {{ isProcessingStarted ? 'Starting...' : 'Start Processing' }}
        </button>
      </div>
    </div>

    <!-- Overall Progress (when uploading) -->
    <div v-if="isUploading" class="mt-6 p-4 bg-white rounded-lg border border-neutral-200">
      <div class="flex justify-between text-sm font-medium text-neutral-900 mb-2">
        <span>Upload Progress</span>
        <span>{{ Math.round((carProgress + receiptProgress) / 2) }}%</span>
      </div>
      <div class="w-full bg-neutral-200 rounded-full h-3">
        <div
          class="bg-primary-600 h-3 rounded-full transition-all duration-300"
          :style="{ width: `${Math.round((carProgress + receiptProgress) / 2)}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useNotificationStore } from '@/stores/notification'

// Props
const props = defineProps({
  sessionId: {
    type: String,
    required: true,
  },
  heroMode: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['upload-complete', 'upload-error', 'processing-started', 'session-created'])

// Stores
const sessionStore = useSessionStore()
const notificationStore = useNotificationStore()

// File state
const carFile = ref(null)
const receiptFile = ref(null)
const carDragActive = ref(false)
const receiptDragActive = ref(false)

// Upload state
const isUploading = ref(false)
const carUploadStatus = ref(null)
const receiptUploadStatus = ref(null)
const carProgress = ref(0)
const receiptProgress = ref(0)
const isProcessingStarted = ref(false)

// File input refs
const carInput = ref(null)
const receiptInput = ref(null)

// Processing options
const processingOptions = ref({
  enableValidation: true,
  enableAutoResolution: false,
  enableEmailNotifications: false,
  priority: 'normal'
})

// Computed
const hasFiles = computed(() => carFile.value || receiptFile.value)
const hasBothFiles = computed(() => carFile.value && receiptFile.value)
const canUpload = computed(() => hasBothFiles.value && !isUploading.value)
const uploadCompleted = computed(() => 
  carUploadStatus.value === 'completed' && receiptUploadStatus.value === 'completed'
)

// File handlers
function triggerCarInput() {
  carInput.value?.click()
}

function triggerReceiptInput() {
  receiptInput.value?.click()
}

function handleCarSelect(event) {
  const file = event.target.files[0]
  if (file) {
    carFile.value = file
    carUploadStatus.value = null
    carProgress.value = 0
  }
  event.target.value = ''
}

function handleReceiptSelect(event) {
  const file = event.target.files[0]
  if (file) {
    receiptFile.value = file
    receiptUploadStatus.value = null
    receiptProgress.value = 0
  }
  event.target.value = ''
}

function handleCarDrop(event) {
  carDragActive.value = false
  const file = event.dataTransfer.files[0]
  if (file) {
    carFile.value = file
    carUploadStatus.value = null
    carProgress.value = 0
  }
}

function handleReceiptDrop(event) {
  receiptDragActive.value = false
  const file = event.dataTransfer.files[0]
  if (file) {
    receiptFile.value = file
    receiptUploadStatus.value = null
    receiptProgress.value = 0
  }
}

function handleDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

function removeCarFile() {
  carFile.value = null
  carUploadStatus.value = null
  carProgress.value = 0
}

function removeReceiptFile() {
  receiptFile.value = null
  receiptUploadStatus.value = null
  receiptProgress.value = 0
}

function clearFiles() {
  carFile.value = null
  receiptFile.value = null
  carUploadStatus.value = null
  receiptUploadStatus.value = null
  carProgress.value = 0
  receiptProgress.value = 0
}

// Upload functionality
async function uploadFiles() {
  if (!canUpload.value) return

  isUploading.value = true
  carUploadStatus.value = 'uploading'
  receiptUploadStatus.value = 'uploading'
  carProgress.value = 0
  receiptProgress.value = 0

  try {
    // Create session if needed
    if (!sessionStore.hasSession) {
      const sessionData = await createSession()
      emit('session-created', sessionData)
    }

    await performUpload()

    carUploadStatus.value = 'completed'
    receiptUploadStatus.value = 'completed'
    carProgress.value = 100
    receiptProgress.value = 100

    emit('upload-complete', {
      sessionId: props.sessionId,
      files: [carFile.value, receiptFile.value]
    })

    notificationStore.addSuccess('Files uploaded successfully!', {
      title: 'Upload Complete',
      duration: 5000
    })

  } catch (error) {
    console.error('Upload error:', error)
    carUploadStatus.value = 'error'
    receiptUploadStatus.value = 'error'
    emit('upload-error', { error: error.message })
  } finally {
    isUploading.value = false
  }
}

async function createSession() {
  // Mock session creation - replace with actual API call
  const sessionData = {
    sessionId: `session-${Date.now()}`,
    sessionName: `Upload Session ${new Date().toLocaleDateString()}`
  }
  
  sessionStore.setSession(sessionData)
  return sessionData
}

async function performUpload() {
  // Simulate upload progress
  const updateProgress = (progress) => {
    carProgress.value = progress
    receiptProgress.value = progress
  }

  for (let i = 0; i <= 100; i += 10) {
    updateProgress(i)
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  // Register files with session store
  sessionStore.addFile({
    id: `car-${Date.now()}`,
    name: carFile.value.name,
    type: carFile.value.type,
    size: carFile.value.size,
    status: 'completed'
  })
  
  sessionStore.addFile({
    id: `receipt-${Date.now() + 1}`,
    name: receiptFile.value.name,
    type: receiptFile.value.type,
    size: receiptFile.value.size,
    status: 'completed'
  })
}

async function startProcessing() {
  if (!uploadCompleted.value) return

  try {
    isProcessingStarted.value = true
    await sessionStore.startProcessing()
    emit('processing-started', { sessionId: props.sessionId })
  } catch (error) {
    console.error('Failed to start processing:', error)
    notificationStore.addError('Failed to start processing')
    isProcessingStarted.value = false
  }
}

// Helper functions
function getUploadStatusText() {
  if (!hasFiles.value) {
    return 'Select both CAR and Receipt files to continue'
  }
  if (isUploading.value) {
    return 'Uploading files...'
  }
  if (uploadCompleted.value) {
    return 'Files uploaded successfully'
  }
  if (!hasBothFiles.value) {
    return 'Both files are required to proceed'
  }
  return 'Ready to upload files'
}

function getStatusColor(status) {
  const colors = {
    uploading: 'text-primary-600',
    completed: 'text-success-600',
    error: 'text-error-600',
  }
  return colors[status] || 'text-neutral-600'
}

function getStatusText(status) {
  const texts = {
    uploading: 'Uploading...',
    completed: 'Completed',
    error: 'Error',
  }
  return texts[status] || ''
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
</script>

<style scoped>
.file-upload-enhanced {
  @apply space-y-6;
}

.upload-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.upload-card:hover {
  transform: translateY(-2px);
}

/* Enhanced animations for hero mode */
.group:hover .group-hover\:text-primary-500 {
  color: rgb(59 130 246);
}

.group:hover .group-hover\:text-primary-700 {
  color: rgb(29 78 216);
}

.group:hover .group-hover\:border-primary-400 {
  border-color: rgb(96 165 250);
}

/* Progressive disclosure animation */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.file-upload-enhanced > * {
  animation: slideUp 0.4s ease-out;
}

/* Focus improvements */
.focus\:ring-primary-500:focus {
  --tw-ring-color: rgb(59 130 246 / 0.5);
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .upload-card {
    margin: 0 -0.5rem;
  }
}
</style>