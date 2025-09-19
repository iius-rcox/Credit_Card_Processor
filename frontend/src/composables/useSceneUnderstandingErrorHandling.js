import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useSceneUnderstandingErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Scene understanding specific error types
  const SCENE_UNDERSTANDING_ERRORS = {
    SU_CAMERA_FAILED: 'su-camera-failed',
    SU_IMAGE_FAILED: 'su-image-failed',
    SU_DETECTION_FAILED: 'su-detection-failed',
    SU_RECOGNITION_FAILED: 'su-recognition-failed',
    SU_CLASSIFICATION_FAILED: 'su-classification-failed',
    SU_SEGMENTATION_FAILED: 'su-segmentation-failed',
    SU_ANALYSIS_FAILED: 'su-analysis-failed',
    SU_INTERPRETATION_FAILED: 'su-interpretation-failed',
    SU_CONTEXT_FAILED: 'su-context-failed',
    SU_RELATIONSHIP_FAILED: 'su-relationship-failed',
    SU_SPATIAL_FAILED: 'su-spatial-failed',
    SU_TEMPORAL_FAILED: 'su-temporal-failed',
    SU_SEMANTIC_FAILED: 'su-semantic-failed',
    SU_GEOMETRIC_FAILED: 'su-geometric-failed',
    SU_TOPOLOGICAL_FAILED: 'su-topological-failed',
    SU_FUNCTIONAL_FAILED: 'su-functional-failed'
  }
  
  // Handle SU camera errors
  function handleSUCameraError(error, camera, context = {}) {
    const errorContext = {
      operation: 'su-camera',
      camera,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_CAMERA_FAILED,
      error,
      errorContext
    }
    
    // SU camera errors are usually non-critical
    console.warn(`SU camera failed:`, camera)
  }
  
  // Handle SU image errors
  function handleSUImageError(error, image, context = {}) {
    const errorContext = {
      operation: 'su-image',
      image,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_IMAGE_FAILED,
      error,
      errorContext
    }
    
    // SU image errors are usually non-critical
    console.warn(`SU image failed:`, image)
  }
  
  // Handle SU detection errors
  function handleSUDetectionError(error, detection, context = {}) {
    const errorContext = {
      operation: 'su-detection',
      detection,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_DETECTION_FAILED,
      error,
      errorContext
    }
    
    // SU detection errors are usually non-critical
    console.warn(`SU detection failed:`, detection)
  }
  
  // Handle SU recognition errors
  function handleSURecognitionError(error, recognition, context = {}) {
    const errorContext = {
      operation: 'su-recognition',
      recognition,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_RECOGNITION_FAILED,
      error,
      errorContext
    }
    
    // SU recognition errors are usually non-critical
    console.warn(`SU recognition failed:`, recognition)
  }
  
  // Handle SU classification errors
  function handleSUClassificationError(error, classification, context = {}) {
    const errorContext = {
      operation: 'su-classification',
      classification,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_CLASSIFICATION_FAILED,
      error,
      errorContext
    }
    
    // SU classification errors are usually non-critical
    console.warn(`SU classification failed:`, classification)
  }
  
  // Handle SU segmentation errors
  function handleSUSegmentationError(error, segmentation, context = {}) {
    const errorContext = {
      operation: 'su-segmentation',
      segmentation,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_SEGMENTATION_FAILED,
      error,
      errorContext
    }
    
    // SU segmentation errors are usually non-critical
    console.warn(`SU segmentation failed:`, segmentation)
  }
  
  // Handle SU analysis errors
  function handleSUAnalysisError(error, analysis, context = {}) {
    const errorContext = {
      operation: 'su-analysis',
      analysis,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_ANALYSIS_FAILED,
      error,
      errorContext
    }
    
    // SU analysis errors are usually non-critical
    console.warn(`SU analysis failed:`, analysis)
  }
  
  // Handle SU interpretation errors
  function handleSUInterpretationError(error, interpretation, context = {}) {
    const errorContext = {
      operation: 'su-interpretation',
      interpretation,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_INTERPRETATION_FAILED,
      error,
      errorContext
    }
    
    // SU interpretation errors are usually non-critical
    console.warn(`SU interpretation failed:`, interpretation)
  }
  
  // Handle SU context errors
  function handleSUContextError(error, context, contextData = {}) {
    const errorContext = {
      operation: 'su-context',
      context,
      ...contextData
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_CONTEXT_FAILED,
      error,
      errorContext
    }
    
    // SU context errors are usually non-critical
    console.warn(`SU context failed:`, context)
  }
  
  // Handle SU relationship errors
  function handleSURelationshipError(error, relationship, context = {}) {
    const errorContext = {
      operation: 'su-relationship',
      relationship,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_RELATIONSHIP_FAILED,
      error,
      errorContext
    }
    
    // SU relationship errors are usually non-critical
    console.warn(`SU relationship failed:`, relationship)
  }
  
  // Handle SU spatial errors
  function handleSUSpatialError(error, spatial, context = {}) {
    const errorContext = {
      operation: 'su-spatial',
      spatial,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_SPATIAL_FAILED,
      error,
      errorContext
    }
    
    // SU spatial errors are usually non-critical
    console.warn(`SU spatial failed:`, spatial)
  }
  
  // Handle SU temporal errors
  function handleSUTemporalError(error, temporal, context = {}) {
    const errorContext = {
      operation: 'su-temporal',
      temporal,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_TEMPORAL_FAILED,
      error,
      errorContext
    }
    
    // SU temporal errors are usually non-critical
    console.warn(`SU temporal failed:`, temporal)
  }
  
  // Handle SU semantic errors
  function handleSUSemanticError(error, semantic, context = {}) {
    const errorContext = {
      operation: 'su-semantic',
      semantic,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_SEMANTIC_FAILED,
      error,
      errorContext
    }
    
    // SU semantic errors are usually non-critical
    console.warn(`SU semantic failed:`, semantic)
  }
  
  // Handle SU geometric errors
  function handleSUGeometricError(error, geometric, context = {}) {
    const errorContext = {
      operation: 'su-geometric',
      geometric,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_GEOMETRIC_FAILED,
      error,
      errorContext
    }
    
    // SU geometric errors are usually non-critical
    console.warn(`SU geometric failed:`, geometric)
  }
  
  // Handle SU topological errors
  function handleSUTopologicalError(error, topological, context = {}) {
    const errorContext = {
      operation: 'su-topological',
      topological,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_TOPOLOGICAL_FAILED,
      error,
      errorContext
    }
    
    // SU topological errors are usually non-critical
    console.warn(`SU topological failed:`, topological)
  }
  
  // Handle SU functional errors
  function handleSUFunctionalError(error, functional, context = {}) {
    const errorContext = {
      operation: 'su-functional',
      functional,
      ...context
    }
    
    errorHandling.addError(
      SCENE_UNDERSTANDING_ERRORS.SU_FUNCTIONAL_FAILED,
      error,
      errorContext
    }
    
    // SU functional errors are usually non-critical
    console.warn(`SU functional failed:`, functional)
  }
  
  // Execute SU operation with error handling
  async function executeSUOperation(operation, operationFunction, context = {}) {
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
  
  // Get SU error summary
  function getSUErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add SU specific analysis
    summary.suErrors = {
      cameraErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_CAMERA_FAILED] || 0,
      imageErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_IMAGE_FAILED] || 0,
      detectionErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_DETECTION_FAILED] || 0,
      recognitionErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_RECOGNITION_FAILED] || 0,
      classificationErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_CLASSIFICATION_FAILED] || 0,
      segmentationErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_SEGMENTATION_FAILED] || 0,
      analysisErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_ANALYSIS_FAILED] || 0,
      interpretationErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_INTERPRETATION_FAILED] || 0,
      contextErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_CONTEXT_FAILED] || 0,
      relationshipErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_RELATIONSHIP_FAILED] || 0,
      spatialErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_SPATIAL_FAILED] || 0,
      temporalErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_TEMPORAL_FAILED] || 0,
      semanticErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_SEMANTIC_FAILED] || 0,
      geometricErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_GEOMETRIC_FAILED] || 0,
      topologicalErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_TOPOLOGICAL_FAILED] || 0,
      functionalErrors: summary.errorTypes[SCENE_UNDERSTANDING_ERRORS.SU_FUNCTIONAL_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear SU errors
  function clearSUErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // SU specific methods
    handleSUCameraError,
    handleSUImageError,
    handleSUDetectionError,
    handleSURecognitionError,
    handleSUClassificationError,
    handleSUSegmentationError,
    handleSUAnalysisError,
    handleSUInterpretationError,
    handleSUContextError,
    handleSURelationshipError,
    handleSUSpatialError,
    handleSUTemporalError,
    handleSUSemanticError,
    handleSUGeometricError,
    handleSUTopologicalError,
    handleSUFunctionalError,
    
    // Utility methods
    executeSUOperation,
    getSUErrorSummary,
    clearSUErrors,
    
    // Constants
    SCENE_UNDERSTANDING_ERRORS
  }
}




