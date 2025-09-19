import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useFileOperationErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // File operation specific error types
  const FILE_OPERATION_ERRORS = {
    FILE_READ_FAILED: 'file-read-failed',
    FILE_WRITE_FAILED: 'file-write-failed',
    FILE_DELETE_FAILED: 'file-delete-failed',
    FILE_UPLOAD_FAILED: 'file-upload-failed',
    FILE_DOWNLOAD_FAILED: 'file-download-failed',
    FILE_VALIDATION_FAILED: 'file-validation-failed',
    FILE_SIZE_EXCEEDED: 'file-size-exceeded',
    FILE_TYPE_UNSUPPORTED: 'file-type-unsupported',
    FILE_CORRUPTED: 'file-corrupted',
    FILE_PERMISSION_DENIED: 'file-permission-denied',
    FILE_NOT_FOUND: 'file-not-found',
    FILE_ALREADY_EXISTS: 'file-already-exists',
    FILE_LOCKED: 'file-locked',
    FILE_QUOTA_EXCEEDED: 'file-quota-exceeded',
    FILE_NETWORK_ERROR: 'file-network-error'
  }
  
  // Handle file read errors
  function handleFileReadError(error, fileName, context = {}) {
    const errorContext = {
      operation: 'file-read',
      fileName,
      ...context
    }
    
    errorHandling.addError(
      FILE_OPERATION_ERRORS.FILE_READ_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Failed to read file: ${fileName}. Please check if the file exists and is accessible.`
    )
  }
  
  // Handle file write errors
  function handleFileWriteError(error, fileName, context = {}) {
    const errorContext = {
      operation: 'file-write',
      fileName,
      ...context
    }
    
    errorHandling.addError(
      FILE_OPERATION_ERRORS.FILE_WRITE_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Failed to write file: ${fileName}. Please check permissions and try again.`
    )
  }
  
  // Handle file upload errors
  function handleFileUploadError(error, fileName, fileSize, context = {}) {
    const errorContext = {
      operation: 'file-upload',
      fileName,
      fileSize,
      ...context
    }
    
    errorHandling.addError(
      FILE_OPERATION_ERRORS.FILE_UPLOAD_FAILED,
      error,
      errorContext
    )
    
    if (error.response?.status === 413) {
      notificationStore.addError(
        `File ${fileName} is too large. Please choose a smaller file.`
      )
    } else if (error.response?.status === 415) {
      notificationStore.addError(
        `File type not supported: ${fileName}. Please choose a different file.`
      )
    } else {
      notificationStore.addError(
        `Failed to upload file: ${fileName}. Please try again.`
      )
    }
  }
  
  // Handle file validation errors
  function handleFileValidationError(error, fileName, validationErrors, context = {}) {
    const errorContext = {
      operation: 'file-validation',
      fileName,
      validationErrors,
      ...context
    }
    
    errorHandling.addError(
      FILE_OPERATION_ERRORS.FILE_VALIDATION_FAILED,
      error,
      errorContext
    )
    
    const errorMessages = validationErrors.map(err => err.message).join(', ')
    notificationStore.addError(
      `File validation failed for ${fileName}: ${errorMessages}`
    )
  }
  
  // Handle file size exceeded errors
  function handleFileSizeExceededError(fileName, fileSize, maxSize, context = {}) {
    const errorContext = {
      operation: 'file-size-check',
      fileName,
      fileSize,
      maxSize,
      ...context
    }
    
    errorHandling.addError(
      FILE_OPERATION_ERRORS.FILE_SIZE_EXCEEDED,
      new Error(`File size ${fileSize} exceeds maximum ${maxSize}`),
      errorContext
    )
    
    const maxSizeMB = Math.round(maxSize / (1024 * 1024))
    const fileSizeMB = Math.round(fileSize / (1024 * 1024))
    notificationStore.addError(
      `File ${fileName} is ${fileSizeMB}MB, which exceeds the maximum size of ${maxSizeMB}MB.`
    )
  }
  
  // Handle file type unsupported errors
  function handleFileTypeUnsupportedError(fileName, fileType, supportedTypes, context = {}) {
    const errorContext = {
      operation: 'file-type-check',
      fileName,
      fileType,
      supportedTypes,
      ...context
    }
    
    errorHandling.addError(
      FILE_OPERATION_ERRORS.FILE_TYPE_UNSUPPORTED,
      new Error(`File type ${fileType} not supported`),
      errorContext
    )
    
    const supportedTypesList = supportedTypes.join(', ')
    notificationStore.addError(
      `File type ${fileType} is not supported. Please choose a file with one of these types: ${supportedTypesList}`
    )
  }
  
  // Execute file operation with error handling
  async function executeFileOperation(operation, operationFunction, context = {}) {
    try {
      return await errorHandling.executeWithErrorHandling(
        operationFunction,
        { operation, ...context }
      )
    } catch (error) {
      // The error handling is already done by executeWithErrorHandling
      throw error
    }
  }
  
  // Get file operation error summary
  function getFileOperationErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add file operation specific analysis
    summary.fileOperationErrors = {
      readErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_READ_FAILED] || 0,
      writeErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_WRITE_FAILED] || 0,
      deleteErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_DELETE_FAILED] || 0,
      uploadErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_UPLOAD_FAILED] || 0,
      downloadErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_DOWNLOAD_FAILED] || 0,
      validationErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_VALIDATION_FAILED] || 0,
      sizeErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_SIZE_EXCEEDED] || 0,
      typeErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_TYPE_UNSUPPORTED] || 0,
      corruptedErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_CORRUPTED] || 0,
      permissionErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_PERMISSION_DENIED] || 0,
      notFoundErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_NOT_FOUND] || 0,
      existsErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_ALREADY_EXISTS] || 0,
      lockedErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_LOCKED] || 0,
      quotaErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_QUOTA_EXCEEDED] || 0,
      networkErrors: summary.errorTypes[FILE_OPERATION_ERRORS.FILE_NETWORK_ERROR] || 0
    }
    
    return summary
  }
  
  // Clear file operation errors
  function clearFileOperationErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // File operation specific methods
    handleFileReadError,
    handleFileWriteError,
    handleFileUploadError,
    handleFileValidationError,
    handleFileSizeExceededError,
    handleFileTypeUnsupportedError,
    
    // Utility methods
    executeFileOperation,
    getFileOperationErrorSummary,
    clearFileOperationErrors,
    
    // Constants
    FILE_OPERATION_ERRORS
  }
}




