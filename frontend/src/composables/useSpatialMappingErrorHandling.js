import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useSpatialMappingErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Spatial mapping specific error types
  const SPATIAL_MAPPING_ERRORS = {
    SM_CAMERA_FAILED: 'sm-camera-failed',
    SM_SENSOR_FAILED: 'sm-sensor-failed',
    SM_MAPPING_FAILED: 'sm-mapping-failed',
    SM_RECONSTRUCTION_FAILED: 'sm-reconstruction-failed',
    SM_MESH_FAILED: 'sm-mesh-failed',
    SM_TEXTURE_FAILED: 'sm-texture-failed',
    SM_LIGHTING_FAILED: 'sm-lighting-failed',
    SM_MATERIAL_FAILED: 'sm-material-failed',
    SM_GEOMETRY_FAILED: 'sm-geometry-failed',
    SM_TOPOLOGY_FAILED: 'sm-topology-failed',
    SM_ALIGNMENT_FAILED: 'sm-alignment-failed',
    SM_REGISTRATION_FAILED: 'sm-registration-failed',
    SM_OPTIMIZATION_FAILED: 'sm-optimization-failed',
    SM_FILTERING_FAILED: 'sm-filtering-failed',
    SM_SMOOTHING_FAILED: 'sm-smoothing-failed',
    SM_COMPRESSION_FAILED: 'sm-compression-failed'
  }
  
  // Handle SM camera errors
  function handleSMCameraError(error, camera, context = {}) {
    const errorContext = {
      operation: 'sm-camera',
      camera,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_CAMERA_FAILED,
      error,
      errorContext
    }
    
    // SM camera errors are usually non-critical
    console.warn(`SM camera failed:`, camera)
  }
  
  // Handle SM sensor errors
  function handleSMSensorError(error, sensor, context = {}) {
    const errorContext = {
      operation: 'sm-sensor',
      sensor,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_SENSOR_FAILED,
      error,
      errorContext
    }
    
    // SM sensor errors are usually non-critical
    console.warn(`SM sensor failed:`, sensor)
  }
  
  // Handle SM mapping errors
  function handleSMMappingError(error, mapping, context = {}) {
    const errorContext = {
      operation: 'sm-mapping',
      mapping,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_MAPPING_FAILED,
      error,
      errorContext
    }
    
    // SM mapping errors are usually non-critical
    console.warn(`SM mapping failed:`, mapping)
  }
  
  // Handle SM reconstruction errors
  function handleSMReconstructionError(error, reconstruction, context = {}) {
    const errorContext = {
      operation: 'sm-reconstruction',
      reconstruction,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_RECONSTRUCTION_FAILED,
      error,
      errorContext
    }
    
    // SM reconstruction errors are usually non-critical
    console.warn(`SM reconstruction failed:`, reconstruction)
  }
  
  // Handle SM mesh errors
  function handleSMMeshError(error, mesh, context = {}) {
    const errorContext = {
      operation: 'sm-mesh',
      mesh,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_MESH_FAILED,
      error,
      errorContext
    }
    
    // SM mesh errors are usually non-critical
    console.warn(`SM mesh failed:`, mesh)
  }
  
  // Handle SM texture errors
  function handleSMTextureError(error, texture, context = {}) {
    const errorContext = {
      operation: 'sm-texture',
      texture,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_TEXTURE_FAILED,
      error,
      errorContext
    }
    
    // SM texture errors are usually non-critical
    console.warn(`SM texture failed:`, texture)
  }
  
  // Handle SM lighting errors
  function handleSMLightingError(error, lighting, context = {}) {
    const errorContext = {
      operation: 'sm-lighting',
      lighting,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_LIGHTING_FAILED,
      error,
      errorContext
    }
    
    // SM lighting errors are usually non-critical
    console.warn(`SM lighting failed:`, lighting)
  }
  
  // Handle SM material errors
  function handleSMMaterialError(error, material, context = {}) {
    const errorContext = {
      operation: 'sm-material',
      material,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_MATERIAL_FAILED,
      error,
      errorContext
    }
    
    // SM material errors are usually non-critical
    console.warn(`SM material failed:`, material)
  }
  
  // Handle SM geometry errors
  function handleSMGeometryError(error, geometry, context = {}) {
    const errorContext = {
      operation: 'sm-geometry',
      geometry,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_GEOMETRY_FAILED,
      error,
      errorContext
    }
    
    // SM geometry errors are usually non-critical
    console.warn(`SM geometry failed:`, geometry)
  }
  
  // Handle SM topology errors
  function handleSMTopologyError(error, topology, context = {}) {
    const errorContext = {
      operation: 'sm-topology',
      topology,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_TOPOLOGY_FAILED,
      error,
      errorContext
    }
    
    // SM topology errors are usually non-critical
    console.warn(`SM topology failed:`, topology)
  }
  
  // Handle SM alignment errors
  function handleSMAlignmentError(error, alignment, context = {}) {
    const errorContext = {
      operation: 'sm-alignment',
      alignment,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_ALIGNMENT_FAILED,
      error,
      errorContext
    }
    
    // SM alignment errors are usually non-critical
    console.warn(`SM alignment failed:`, alignment)
  }
  
  // Handle SM registration errors
  function handleSMRegistrationError(error, registration, context = {}) {
    const errorContext = {
      operation: 'sm-registration',
      registration,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_REGISTRATION_FAILED,
      error,
      errorContext
    }
    
    // SM registration errors are usually non-critical
    console.warn(`SM registration failed:`, registration)
  }
  
  // Handle SM optimization errors
  function handleSMOptimizationError(error, optimization, context = {}) {
    const errorContext = {
      operation: 'sm-optimization',
      optimization,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_OPTIMIZATION_FAILED,
      error,
      errorContext
    }
    
    // SM optimization errors are usually non-critical
    console.warn(`SM optimization failed:`, optimization)
  }
  
  // Handle SM filtering errors
  function handleSMFilteringError(error, filtering, context = {}) {
    const errorContext = {
      operation: 'sm-filtering',
      filtering,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_FILTERING_FAILED,
      error,
      errorContext
    }
    
    // SM filtering errors are usually non-critical
    console.warn(`SM filtering failed:`, filtering)
  }
  
  // Handle SM smoothing errors
  function handleSMSmoothingError(error, smoothing, context = {}) {
    const errorContext = {
      operation: 'sm-smoothing',
      smoothing,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_SMOOTHING_FAILED,
      error,
      errorContext
    }
    
    // SM smoothing errors are usually non-critical
    console.warn(`SM smoothing failed:`, smoothing)
  }
  
  // Handle SM compression errors
  function handleSMCompressionError(error, compression, context = {}) {
    const errorContext = {
      operation: 'sm-compression',
      compression,
      ...context
    }
    
    errorHandling.addError(
      SPATIAL_MAPPING_ERRORS.SM_COMPRESSION_FAILED,
      error,
      errorContext
    }
    
    // SM compression errors are usually non-critical
    console.warn(`SM compression failed:`, compression)
  }
  
  // Execute SM operation with error handling
  async function executeSMOperation(operation, operationFunction, context = {}) {
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
  
  // Get SM error summary
  function getSMErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add SM specific analysis
    summary.smErrors = {
      cameraErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_CAMERA_FAILED] || 0,
      sensorErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_SENSOR_FAILED] || 0,
      mappingErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_MAPPING_FAILED] || 0,
      reconstructionErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_RECONSTRUCTION_FAILED] || 0,
      meshErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_MESH_FAILED] || 0,
      textureErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_TEXTURE_FAILED] || 0,
      lightingErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_LIGHTING_FAILED] || 0,
      materialErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_MATERIAL_FAILED] || 0,
      geometryErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_GEOMETRY_FAILED] || 0,
      topologyErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_TOPOLOGY_FAILED] || 0,
      alignmentErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_ALIGNMENT_FAILED] || 0,
      registrationErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_REGISTRATION_FAILED] || 0,
      optimizationErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_OPTIMIZATION_FAILED] || 0,
      filteringErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_FILTERING_FAILED] || 0,
      smoothingErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_SMOOTHING_FAILED] || 0,
      compressionErrors: summary.errorTypes[SPATIAL_MAPPING_ERRORS.SM_COMPRESSION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear SM errors
  function clearSMErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // SM specific methods
    handleSMCameraError,
    handleSMSensorError,
    handleSMMappingError,
    handleSMReconstructionError,
    handleSMMeshError,
    handleSMTextureError,
    handleSMLightingError,
    handleSMMaterialError,
    handleSMGeometryError,
    handleSMTopologyError,
    handleSMAlignmentError,
    handleSMRegistrationError,
    handleSMOptimizationError,
    handleSMFilteringError,
    handleSMSmoothingError,
    handleSMCompressionError,
    
    // Utility methods
    executeSMOperation,
    getSMErrorSummary,
    clearSMErrors,
    
    // Constants
    SPATIAL_MAPPING_ERRORS
  }
}


