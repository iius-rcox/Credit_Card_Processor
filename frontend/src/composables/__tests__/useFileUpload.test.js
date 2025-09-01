import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { useFileUpload } from '../useFileUpload.js'
import { createMockFile, flushPromises } from '../../test/utils.js'

// Mock XMLHttpRequest
class MockXMLHttpRequest {
  constructor() {
    this.upload = { addEventListener: vi.fn() }
    this.addEventListener = vi.fn()
    this.open = vi.fn()
    this.setRequestHeader = vi.fn()
    this.send = vi.fn()
    this.status = 200
    this.statusText = 'OK'
    this.responseText = JSON.stringify({ success: true })
  }

  triggerProgress(loaded, total) {
    const progressCallback = this.upload.addEventListener.mock.calls.find(
      call => call[0] === 'progress'
    )?.[1]
    if (progressCallback) {
      progressCallback({ lengthComputable: true, loaded, total })
    }
  }

  triggerLoad() {
    const loadCallback = this.addEventListener.mock.calls.find(
      call => call[0] === 'load'
    )?.[1]
    if (loadCallback) {
      loadCallback()
    }
  }

  triggerError() {
    const errorCallback = this.addEventListener.mock.calls.find(
      call => call[0] === 'error'
    )?.[1]
    if (errorCallback) {
      errorCallback()
    }
  }

  triggerAbort() {
    const abortCallback = this.addEventListener.mock.calls.find(
      call => call[0] === 'abort'
    )?.[1]
    if (abortCallback) {
      abortCallback()
    }
  }
}

global.XMLHttpRequest = vi.fn(() => new MockXMLHttpRequest())

// Mock the useApi composable
const mockUploadFile = vi.fn()
vi.mock('../useApi.js', () => ({
  useApi: () => ({
    uploadFile: mockUploadFile,
  }),
}))

describe('useFileUpload', () => {
  let fileUpload

  beforeEach(() => {
    fileUpload = useFileUpload()
    vi.clearAllMocks()
    global.XMLHttpRequest.mockClear()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(fileUpload.files.value).toEqual([])
      expect(fileUpload.isUploading.value).toBe(false)
      expect(fileUpload.uploadProgress.value).toEqual({})
    })

    it('should have correct initial computed properties', () => {
      expect(fileUpload.hasFiles.value).toBe(false)
      expect(fileUpload.pendingFiles.value).toEqual([])
      expect(fileUpload.uploadingFiles.value).toEqual([])
      expect(fileUpload.completedFiles.value).toEqual([])
      expect(fileUpload.errorFiles.value).toEqual([])
      expect(fileUpload.hasPendingFiles.value).toBe(false)
      expect(fileUpload.hasErrors.value).toBe(false)
      expect(fileUpload.allCompleted.value).toBe(false)
      expect(fileUpload.totalFiles.value).toBe(0)
      expect(fileUpload.completedCount.value).toBe(0)
      expect(fileUpload.overallProgress.value).toBe(0)
    })

    it('should expose correct constants', () => {
      expect(fileUpload.MAX_FILE_SIZE).toBe(100 * 1024 * 1024) // 100MB
      expect(fileUpload.ALLOWED_TYPES).toEqual(['application/pdf'])
      expect(fileUpload.ALLOWED_EXTENSIONS).toEqual(['.pdf'])
    })
  })

  describe('File Validation', () => {
    it('should validate correct PDF files', () => {
      const validFile = createMockFile('test.pdf', 1024, 'application/pdf')
      const result = fileUpload.validateFile(validFile)

      expect(result.valid).toBe(true)
      expect(result.error).toBe(null)
    })

    it('should reject files that are too large', () => {
      const largeFile = createMockFile('large.pdf', 150 * 1024 * 1024) // 150MB
      const result = fileUpload.validateFile(largeFile)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds 100MB limit')
    })

    it('should reject non-PDF file types', () => {
      const textFile = createMockFile('document.txt', 1024, 'text/plain')
      const result = fileUpload.validateFile(textFile)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Only PDF files are supported')
    })

    it('should validate PDF files by extension when MIME type is incorrect', () => {
      const pdfWithWrongMime = createMockFile(
        'document.pdf',
        1024,
        'application/octet-stream'
      )
      const result = fileUpload.validateFile(pdfWithWrongMime)

      expect(result.valid).toBe(true)
      expect(result.error).toBe(null)
    })

    it('should reject files with wrong extensions', () => {
      const wrongExtension = createMockFile(
        'document.doc',
        1024,
        'application/pdf'
      )
      const result = fileUpload.validateFile(wrongExtension)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Only PDF files are supported')
    })

    it('should reject empty files', () => {
      const emptyFile = createMockFile('empty.pdf', 0)
      const result = fileUpload.validateFile(emptyFile)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('File is empty')
    })

    it('should handle files with no extension', () => {
      const noExtension = createMockFile('document', 1024, 'text/plain')
      const result = fileUpload.validateFile(noExtension)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Only PDF files are supported')
    })
  })

  describe('File Management', () => {
    it('should add valid files to queue', () => {
      const file1 = createMockFile('test1.pdf', 1024)
      const file2 = createMockFile('test2.pdf', 2048)

      const addedFiles = fileUpload.addFiles([file1, file2])

      expect(fileUpload.files.value).toHaveLength(2)
      expect(addedFiles).toHaveLength(2)
      expect(fileUpload.hasFiles.value).toBe(true)
      expect(fileUpload.totalFiles.value).toBe(2)

      // Check file structure
      const addedFile = fileUpload.files.value[0]
      expect(addedFile).toMatchObject({
        file: file1,
        name: 'test1.pdf',
        size: 1024,
        status: 'pending',
        error: null,
        progress: 0,
      })
      expect(addedFile.id).toBeTruthy()
    })

    it('should mark invalid files with error status', () => {
      const validFile = createMockFile('valid.pdf', 1024)
      const invalidFile = createMockFile('invalid.txt', 1024, 'text/plain')

      fileUpload.addFiles([validFile, invalidFile])

      expect(fileUpload.files.value).toHaveLength(2)
      expect(fileUpload.pendingFiles.value).toHaveLength(1)
      expect(fileUpload.errorFiles.value).toHaveLength(1)
      expect(fileUpload.hasErrors.value).toBe(true)

      const errorFile = fileUpload.errorFiles.value[0]
      expect(errorFile.status).toBe('error')
      expect(errorFile.error).toBe('Only PDF files are supported')
    })

    it('should generate unique IDs for files', () => {
      const file1 = createMockFile('test1.pdf', 1024)
      const file2 = createMockFile('test2.pdf', 1024)

      fileUpload.addFiles([file1, file2])

      const ids = fileUpload.files.value.map(f => f.id)
      expect(new Set(ids).size).toBe(ids.length) // All IDs are unique
      ids.forEach(id => {
        expect(id).toMatch(/^file_\d+_[a-z0-9]+$/)
      })
    })

    it('should initialize upload progress for valid files', () => {
      const file1 = createMockFile('test1.pdf', 1024)
      const file2 = createMockFile('test2.pdf', 1024)

      fileUpload.addFiles([file1, file2])

      const fileIds = fileUpload.files.value.map(f => f.id)
      fileIds.forEach(id => {
        expect(fileUpload.uploadProgress.value[id]).toBe(0)
      })
    })

    it('should remove specific files', () => {
      const file1 = createMockFile('test1.pdf', 1024)
      const file2 = createMockFile('test2.pdf', 1024)

      fileUpload.addFiles([file1, file2])
      const fileIdToRemove = fileUpload.files.value[0].id

      fileUpload.removeFile(fileIdToRemove)

      expect(fileUpload.files.value).toHaveLength(1)
      expect(fileUpload.files.value[0].name).toBe('test2.pdf')
      expect(fileUpload.uploadProgress.value[fileIdToRemove]).toBeUndefined()
    })

    it('should handle removing non-existent files gracefully', () => {
      const file = createMockFile('test.pdf', 1024)
      fileUpload.addFiles([file])

      fileUpload.removeFile('non-existent-id')

      expect(fileUpload.files.value).toHaveLength(1)
    })

    it('should clear all files', () => {
      const file1 = createMockFile('test1.pdf', 1024)
      const file2 = createMockFile('test2.pdf', 1024)

      fileUpload.addFiles([file1, file2])
      fileUpload.isUploading.value = true

      fileUpload.clearFiles()

      expect(fileUpload.files.value).toEqual([])
      expect(fileUpload.uploadProgress.value).toEqual({})
      expect(fileUpload.isUploading.value).toBe(false)
      expect(fileUpload.hasFiles.value).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    beforeEach(() => {
      const validFile = createMockFile('valid.pdf', 1024)
      const invalidFile = createMockFile('invalid.txt', 1024, 'text/plain')

      fileUpload.addFiles([validFile, invalidFile])

      // Simulate different statuses
      fileUpload.files.value[0].status = 'completed'
      fileUpload.files.value[0].progress = 100
    })

    it('should compute file status arrays correctly', () => {
      expect(fileUpload.pendingFiles.value).toHaveLength(0)
      expect(fileUpload.uploadingFiles.value).toHaveLength(0)
      expect(fileUpload.completedFiles.value).toHaveLength(1)
      expect(fileUpload.errorFiles.value).toHaveLength(1)
    })

    it('should compute boolean flags correctly', () => {
      expect(fileUpload.hasFiles.value).toBe(true)
      expect(fileUpload.hasPendingFiles.value).toBe(false)
      expect(fileUpload.hasErrors.value).toBe(true)
      expect(fileUpload.allCompleted.value).toBe(false)
    })

    it('should compute counts correctly', () => {
      expect(fileUpload.totalFiles.value).toBe(2)
      expect(fileUpload.completedCount.value).toBe(1)
    })

    it('should compute overall progress correctly', () => {
      // One file at 100%, one at 0%
      expect(fileUpload.overallProgress.value).toBe(50)
    })

    it('should handle allCompleted when all files are completed', () => {
      fileUpload.files.value.forEach(file => {
        file.status = 'completed'
      })

      expect(fileUpload.allCompleted.value).toBe(true)
    })

    it('should return 0 progress when no files', () => {
      fileUpload.clearFiles()
      expect(fileUpload.overallProgress.value).toBe(0)
    })
  })

  describe('Single File Upload', () => {
    let mockXHR

    beforeEach(() => {
      mockXHR = new MockXMLHttpRequest()
      global.XMLHttpRequest.mockImplementation(() => mockXHR)
    })

    it('should upload file successfully', async () => {
      const file = createMockFile('test.pdf', 1024)
      fileUpload.addFiles([file])
      const fileObj = fileUpload.files.value[0]

      mockXHR.responseText = JSON.stringify({
        success: true,
        uploaded_files: [
          {
            checksum: 'abc123',
            upload_status: 'success',
            server_filename: 'uploaded_test.pdf',
          },
        ],
      })

      const uploadPromise = fileUpload.uploadSingleFile('session-123', fileObj)

      // Simulate upload progress
      mockXHR.triggerProgress(512, 1024) // 50% progress
      await nextTick()
      expect(fileUpload.uploadProgress.value[fileObj.id]).toBe(50)
      expect(fileObj.progress).toBe(50)

      // Complete upload
      mockXHR.triggerLoad()
      const result = await uploadPromise

      expect(mockXHR.open).toHaveBeenCalledWith(
        'POST',
        '/api/sessions/session-123/upload'
      )
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith(
        'x-dev-user',
        'testuser'
      )
      expect(fileObj.status).toBe('completed')
      expect(fileObj.progress).toBe(100)
      expect(fileObj.checksum).toBe('abc123')
      expect(result.success).toBe(true)
    })

    it('should handle upload progress updates', async () => {
      const file = createMockFile('test.pdf', 2048)
      fileUpload.addFiles([file])
      const fileObj = fileUpload.files.value[0]

      const uploadPromise = fileUpload.uploadSingleFile('session-123', fileObj)

      // Simulate multiple progress updates
      mockXHR.triggerProgress(512, 2048) // 25%
      await nextTick()
      expect(fileObj.progress).toBe(25)

      mockXHR.triggerProgress(1536, 2048) // 75%
      await nextTick()
      expect(fileObj.progress).toBe(75)

      mockXHR.triggerProgress(2048, 2048) // 100%
      await nextTick()
      expect(fileObj.progress).toBe(100)

      mockXHR.triggerLoad()
      await uploadPromise
    })

    it('should handle HTTP error responses', async () => {
      const file = createMockFile('test.pdf', 1024)
      fileUpload.addFiles([file])
      const fileObj = fileUpload.files.value[0]

      mockXHR.status = 413
      mockXHR.statusText = 'Payload Too Large'
      mockXHR.responseText = JSON.stringify({
        detail: 'File too large',
      })

      const uploadPromise = fileUpload.uploadSingleFile('session-123', fileObj)
      mockXHR.triggerLoad()

      await expect(uploadPromise).rejects.toMatchObject({
        success: false,
        error: 'File too large',
      })

      expect(fileObj.status).toBe('error')
      expect(fileObj.error).toBe('File too large')
    })

    it('should handle network errors', async () => {
      const file = createMockFile('test.pdf', 1024)
      fileUpload.addFiles([file])
      const fileObj = fileUpload.files.value[0]

      const uploadPromise = fileUpload.uploadSingleFile('session-123', fileObj)
      mockXHR.triggerError()

      await expect(uploadPromise).rejects.toMatchObject({
        success: false,
        error: 'Network error during upload',
      })

      expect(fileObj.status).toBe('error')
    })

    it('should handle upload abortion', async () => {
      const file = createMockFile('test.pdf', 1024)
      fileUpload.addFiles([file])
      const fileObj = fileUpload.files.value[0]

      const uploadPromise = fileUpload.uploadSingleFile('session-123', fileObj)
      mockXHR.triggerAbort()

      await expect(uploadPromise).rejects.toMatchObject({
        success: false,
        error: 'Upload cancelled',
      })

      expect(fileObj.status).toBe('error')
    })

    it('should handle malformed JSON responses', async () => {
      const file = createMockFile('test.pdf', 1024)
      fileUpload.addFiles([file])
      const fileObj = fileUpload.files.value[0]

      mockXHR.responseText = 'invalid json'

      const uploadPromise = fileUpload.uploadSingleFile('session-123', fileObj)
      mockXHR.triggerLoad()

      await expect(uploadPromise).rejects.toMatchObject({
        success: false,
        error: 'Invalid response from server',
      })

      expect(fileObj.status).toBe('error')
    })

    it('should set file status to uploading during upload', async () => {
      const file = createMockFile('test.pdf', 1024)
      fileUpload.addFiles([file])
      const fileObj = fileUpload.files.value[0]

      expect(fileObj.status).toBe('pending')

      const uploadPromise = fileUpload.uploadSingleFile('session-123', fileObj)

      expect(fileObj.status).toBe('uploading')

      mockXHR.triggerLoad()
      await uploadPromise

      expect(fileObj.status).toBe('completed')
    })
  })

  describe('Batch File Upload', () => {
    it('should upload all pending files', async () => {
      const file1 = createMockFile('test1.pdf', 1024)
      const file2 = createMockFile('test2.pdf', 2048)
      const invalidFile = createMockFile('test3.txt', 1024, 'text/plain')

      fileUpload.addFiles([file1, file2, invalidFile])

      // Mock successful uploads
      let callCount = 0
      global.XMLHttpRequest.mockImplementation(() => {
        const mockXHR = new MockXMLHttpRequest()
        mockXHR.responseText = JSON.stringify({
          success: true,
          uploaded_files: [{ checksum: `checksum${++callCount}` }],
        })
        // Auto-trigger load after a short delay
        setTimeout(() => mockXHR.triggerLoad(), 10)
        return mockXHR
      })

      const results = await fileUpload.uploadAllFiles('session-123')

      expect(results).toHaveLength(2) // Only pending files
      expect(results.every(r => r.success)).toBe(true)
      expect(fileUpload.completedFiles.value).toHaveLength(2)
      expect(fileUpload.isUploading.value).toBe(false)
    })

    it('should handle mixed success and failure results', async () => {
      const file1 = createMockFile('test1.pdf', 1024)
      const file2 = createMockFile('test2.pdf', 2048)

      fileUpload.addFiles([file1, file2])

      let callCount = 0
      global.XMLHttpRequest.mockImplementation(() => {
        callCount++
        const mockXHR = new MockXMLHttpRequest()

        if (callCount === 1) {
          // First upload succeeds
          mockXHR.responseText = JSON.stringify({ success: true })
          setTimeout(() => mockXHR.triggerLoad(), 10)
        } else {
          // Second upload fails
          mockXHR.status = 400
          setTimeout(() => mockXHR.triggerLoad(), 10)
        }

        return mockXHR
      })

      const results = await fileUpload.uploadAllFiles('session-123')

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(fileUpload.completedFiles.value).toHaveLength(1)
      expect(fileUpload.errorFiles.value).toHaveLength(2) // Original invalid + failed upload
    })

    it('should set uploading state during batch upload', async () => {
      const file = createMockFile('test.pdf', 1024)
      fileUpload.addFiles([file])

      global.XMLHttpRequest.mockImplementation(() => {
        const mockXHR = new MockXMLHttpRequest()
        // Don't auto-trigger completion
        return mockXHR
      })

      const uploadPromise = fileUpload.uploadAllFiles('session-123')

      expect(fileUpload.isUploading.value).toBe(true)

      // Complete the upload
      setTimeout(() => {
        const mockXHR = global.XMLHttpRequest.mock.results[0].value
        mockXHR.triggerLoad()
      }, 10)

      await uploadPromise
      expect(fileUpload.isUploading.value).toBe(false)
    })

    it('should throw error when no session ID provided', async () => {
      const file = createMockFile('test.pdf', 1024)
      fileUpload.addFiles([file])

      await expect(fileUpload.uploadAllFiles()).rejects.toThrow(
        'Session ID is required'
      )
      await expect(fileUpload.uploadAllFiles('')).rejects.toThrow(
        'Session ID is required'
      )
      await expect(fileUpload.uploadAllFiles(null)).rejects.toThrow(
        'Session ID is required'
      )
    })

    it('should throw error when no pending files', async () => {
      await expect(fileUpload.uploadAllFiles('session-123')).rejects.toThrow(
        'No files available for upload'
      )

      // Add only invalid files
      const invalidFile = createMockFile('test.txt', 1024, 'text/plain')
      fileUpload.addFiles([invalidFile])

      await expect(fileUpload.uploadAllFiles('session-123')).rejects.toThrow(
        'No files available for upload'
      )
    })
  })

  describe('Utility Functions', () => {
    it('should format file sizes correctly', () => {
      expect(fileUpload.formatFileSize(0)).toBe('0 Bytes')
      expect(fileUpload.formatFileSize(512)).toBe('512 Bytes')
      expect(fileUpload.formatFileSize(1024)).toBe('1 KB')
      expect(fileUpload.formatFileSize(1536)).toBe('1.5 KB')
      expect(fileUpload.formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(fileUpload.formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
      expect(fileUpload.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('should handle very large file sizes', () => {
      const largeSize = 1024 * 1024 * 1024 * 1.5 // 1.5 GB
      expect(fileUpload.formatFileSize(largeSize)).toBe('1.5 GB')
    })
  })

  describe('Edge Cases', () => {
    it('should handle FileList objects', () => {
      const file1 = createMockFile('test1.pdf', 1024)
      const file2 = createMockFile('test2.pdf', 2048)

      // Simulate FileList by creating array-like object
      const fileList = {
        0: file1,
        1: file2,
        length: 2,
        [Symbol.iterator]: function* () {
          yield file1
          yield file2
        },
      }

      const addedFiles = fileUpload.addFiles(fileList)

      expect(addedFiles).toHaveLength(2)
      expect(fileUpload.files.value).toHaveLength(2)
    })

    it('should handle empty file lists', () => {
      const addedFiles = fileUpload.addFiles([])

      expect(addedFiles).toHaveLength(0)
      expect(fileUpload.files.value).toHaveLength(0)
    })

    it('should handle files with very long names', () => {
      const longName = 'a'.repeat(300) + '.pdf'
      const file = createMockFile(longName, 1024)

      fileUpload.addFiles([file])

      expect(fileUpload.files.value[0].name).toBe(longName)
    })

    it('should handle files with special characters in names', () => {
      const specialName = 'tést file (1) [copy] #2.pdf'
      const file = createMockFile(specialName, 1024)

      fileUpload.addFiles([file])

      expect(fileUpload.files.value[0].name).toBe(specialName)
    })

    it('should handle progress events without lengthComputable', async () => {
      const file = createMockFile('test.pdf', 1024)
      fileUpload.addFiles([file])
      const fileObj = fileUpload.files.value[0]

      const mockXHR = new MockXMLHttpRequest()
      global.XMLHttpRequest.mockImplementation(() => mockXHR)

      fileUpload.uploadSingleFile('session-123', fileObj)

      // Trigger progress without lengthComputable
      const progressCallback = mockXHR.upload.addEventListener.mock.calls.find(
        call => call[0] === 'progress'
      )?.[1]

      progressCallback({ lengthComputable: false, loaded: 100, total: 0 })

      // Progress should not be updated
      expect(fileObj.progress).toBe(0)
    })
  })

  describe('Memory Management', () => {
    it('should clean up upload progress when files are removed', () => {
      const file1 = createMockFile('test1.pdf', 1024)
      const file2 = createMockFile('test2.pdf', 1024)

      fileUpload.addFiles([file1, file2])
      const fileId = fileUpload.files.value[0].id

      expect(fileUpload.uploadProgress.value[fileId]).toBe(0)

      fileUpload.removeFile(fileId)

      expect(fileUpload.uploadProgress.value[fileId]).toBeUndefined()
    })

    it('should clean up all progress when clearing files', () => {
      const file1 = createMockFile('test1.pdf', 1024)
      const file2 = createMockFile('test2.pdf', 1024)

      fileUpload.addFiles([file1, file2])

      expect(Object.keys(fileUpload.uploadProgress.value)).toHaveLength(2)

      fileUpload.clearFiles()

      expect(fileUpload.uploadProgress.value).toEqual({})
    })
  })

  describe('Integration', () => {
    it('should work with real file objects', () => {
      // Create a more realistic file object
      const realFile = new File(['pdf content'], 'real-test.pdf', {
        type: 'application/pdf',
        lastModified: Date.now(),
      })

      fileUpload.addFiles([realFile])

      const addedFile = fileUpload.files.value[0]
      expect(addedFile.file).toBe(realFile)
      expect(addedFile.name).toBe('real-test.pdf')
      expect(addedFile.type).toBe('application/pdf')
      expect(addedFile.status).toBe('pending')
    })
  })
})
