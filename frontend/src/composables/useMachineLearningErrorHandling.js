import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useMachineLearningErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Machine learning specific error types
  const MACHINE_LEARNING_ERRORS = {
    ML_MODEL_LOADING_FAILED: 'ml-model-loading-failed',
    ML_MODEL_TRAINING_FAILED: 'ml-model-training-failed',
    ML_MODEL_PREDICTION_FAILED: 'ml-model-prediction-failed',
    ML_MODEL_EVALUATION_FAILED: 'ml-model-evaluation-failed',
    ML_MODEL_OPTIMIZATION_FAILED: 'ml-model-optimization-failed',
    ML_MODEL_VALIDATION_FAILED: 'ml-model-validation-failed',
    ML_MODEL_CROSS_VALIDATION_FAILED: 'ml-model-cross-validation-failed',
    ML_MODEL_HYPERPARAMETER_FAILED: 'ml-model-hyperparameter-failed',
    ML_MODEL_FEATURE_FAILED: 'ml-model-feature-failed',
    ML_MODEL_PREPROCESSING_FAILED: 'ml-model-preprocessing-failed',
    ML_MODEL_POSTPROCESSING_FAILED: 'ml-model-postprocessing-failed',
    ML_MODEL_SERIALIZATION_FAILED: 'ml-model-serialization-failed',
    ML_MODEL_DESERIALIZATION_FAILED: 'ml-model-deserialization-failed',
    ML_MODEL_VERSIONING_FAILED: 'ml-model-versioning-failed',
    ML_MODEL_DEPLOYMENT_FAILED: 'ml-model-deployment-failed'
  }
  
  // Handle ML model loading errors
  function handleMLModelLoadingError(error, model, context = {}) {
    const errorContext = {
      operation: 'ml-model-loading',
      model,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_LOADING_FAILED,
      error,
      errorContext
    }
    
    // ML model loading errors are usually non-critical
    console.warn(`ML model loading failed for ${model}:`, error)
  }
  
  // Handle ML model training errors
  function handleMLModelTrainingError(error, model, training, context = {}) {
    const errorContext = {
      operation: 'ml-model-training',
      model,
      training,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_TRAINING_FAILED,
      error,
      errorContext
    }
    
    // ML model training errors are usually non-critical
    console.warn(`ML model training failed for ${model}:`, training)
  }
  
  // Handle ML model prediction errors
  function handleMLModelPredictionError(error, model, prediction, context = {}) {
    const errorContext = {
      operation: 'ml-model-prediction',
      model,
      prediction,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_PREDICTION_FAILED,
      error,
      errorContext
    }
    
    // ML model prediction errors are usually non-critical
    console.warn(`ML model prediction failed for ${model}:`, prediction)
  }
  
  // Handle ML model evaluation errors
  function handleMLModelEvaluationError(error, model, evaluation, context = {}) {
    const errorContext = {
      operation: 'ml-model-evaluation',
      model,
      evaluation,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_EVALUATION_FAILED,
      error,
      errorContext
    }
    
    // ML model evaluation errors are usually non-critical
    console.warn(`ML model evaluation failed for ${model}:`, evaluation)
  }
  
  // Handle ML model optimization errors
  function handleMLModelOptimizationError(error, model, optimization, context = {}) {
    const errorContext = {
      operation: 'ml-model-optimization',
      model,
      optimization,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_OPTIMIZATION_FAILED,
      error,
      errorContext
    }
    
    // ML model optimization errors are usually non-critical
    console.warn(`ML model optimization failed for ${model}:`, optimization)
  }
  
  // Handle ML model validation errors
  function handleMLModelValidationError(error, model, validation, context = {}) {
    const errorContext = {
      operation: 'ml-model-validation',
      model,
      validation,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_VALIDATION_FAILED,
      error,
      errorContext
    }
    
    // ML model validation errors are usually non-critical
    console.warn(`ML model validation failed for ${model}:`, validation)
  }
  
  // Handle ML model cross validation errors
  function handleMLModelCrossValidationError(error, model, crossValidation, context = {}) {
    const errorContext = {
      operation: 'ml-model-cross-validation',
      model,
      crossValidation,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_CROSS_VALIDATION_FAILED,
      error,
      errorContext
    }
    
    // ML model cross validation errors are usually non-critical
    console.warn(`ML model cross validation failed for ${model}:`, crossValidation)
  }
  
  // Handle ML model hyperparameter errors
  function handleMLModelHyperparameterError(error, model, hyperparameter, context = {}) {
    const errorContext = {
      operation: 'ml-model-hyperparameter',
      model,
      hyperparameter,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_HYPERPARAMETER_FAILED,
      error,
      errorContext
    }
    
    // ML model hyperparameter errors are usually non-critical
    console.warn(`ML model hyperparameter failed for ${model}:`, hyperparameter)
  }
  
  // Handle ML model feature errors
  function handleMLModelFeatureError(error, model, feature, context = {}) {
    const errorContext = {
      operation: 'ml-model-feature',
      model,
      feature,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_FEATURE_FAILED,
      error,
      errorContext
    }
    
    // ML model feature errors are usually non-critical
    console.warn(`ML model feature failed for ${model}:`, feature)
  }
  
  // Handle ML model preprocessing errors
  function handleMLModelPreprocessingError(error, model, preprocessing, context = {}) {
    const errorContext = {
      operation: 'ml-model-preprocessing',
      model,
      preprocessing,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_PREPROCESSING_FAILED,
      error,
      errorContext
    }
    
    // ML model preprocessing errors are usually non-critical
    console.warn(`ML model preprocessing failed for ${model}:`, preprocessing)
  }
  
  // Handle ML model postprocessing errors
  function handleMLModelPostprocessingError(error, model, postprocessing, context = {}) {
    const errorContext = {
      operation: 'ml-model-postprocessing',
      model,
      postprocessing,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_POSTPROCESSING_FAILED,
      error,
      errorContext
    }
    
    // ML model postprocessing errors are usually non-critical
    console.warn(`ML model postprocessing failed for ${model}:`, postprocessing)
  }
  
  // Handle ML model serialization errors
  function handleMLModelSerializationError(error, model, serialization, context = {}) {
    const errorContext = {
      operation: 'ml-model-serialization',
      model,
      serialization,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_SERIALIZATION_FAILED,
      error,
      errorContext
    }
    
    // ML model serialization errors are usually non-critical
    console.warn(`ML model serialization failed for ${model}:`, serialization)
  }
  
  // Handle ML model deserialization errors
  function handleMLModelDeserializationError(error, model, deserialization, context = {}) {
    const errorContext = {
      operation: 'ml-model-deserialization',
      model,
      deserialization,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_DESERIALIZATION_FAILED,
      error,
      errorContext
    }
    
    // ML model deserialization errors are usually non-critical
    console.warn(`ML model deserialization failed for ${model}:`, deserialization)
  }
  
  // Handle ML model versioning errors
  function handleMLModelVersioningError(error, model, versioning, context = {}) {
    const errorContext = {
      operation: 'ml-model-versioning',
      model,
      versioning,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_VERSIONING_FAILED,
      error,
      errorContext
    }
    
    // ML model versioning errors are usually non-critical
    console.warn(`ML model versioning failed for ${model}:`, versioning)
  }
  
  // Handle ML model deployment errors
  function handleMLModelDeploymentError(error, model, deployment, context = {}) {
    const errorContext = {
      operation: 'ml-model-deployment',
      model,
      deployment,
      ...context
    }
    
    errorHandling.addError(
      MACHINE_LEARNING_ERRORS.ML_MODEL_DEPLOYMENT_FAILED,
      error,
      errorContext
    }
    
    // ML model deployment errors are usually non-critical
    console.warn(`ML model deployment failed for ${model}:`, deployment)
  }
  
  // Execute ML operation with error handling
  async function executeMLOperation(operation, operationFunction, context = {}) {
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
  
  // Get ML error summary
  function getMLErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add ML specific analysis
    summary.mlErrors = {
      loadingErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_LOADING_FAILED] || 0,
      trainingErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_TRAINING_FAILED] || 0,
      predictionErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_PREDICTION_FAILED] || 0,
      evaluationErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_EVALUATION_FAILED] || 0,
      optimizationErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_OPTIMIZATION_FAILED] || 0,
      validationErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_VALIDATION_FAILED] || 0,
      crossValidationErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_CROSS_VALIDATION_FAILED] || 0,
      hyperparameterErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_HYPERPARAMETER_FAILED] || 0,
      featureErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_FEATURE_FAILED] || 0,
      preprocessingErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_PREPROCESSING_FAILED] || 0,
      postprocessingErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_POSTPROCESSING_FAILED] || 0,
      serializationErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_SERIALIZATION_FAILED] || 0,
      deserializationErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_DESERIALIZATION_FAILED] || 0,
      versioningErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_VERSIONING_FAILED] || 0,
      deploymentErrors: summary.errorTypes[MACHINE_LEARNING_ERRORS.ML_MODEL_DEPLOYMENT_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear ML errors
  function clearMLErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // ML specific methods
    handleMLModelLoadingError,
    handleMLModelTrainingError,
    handleMLModelPredictionError,
    handleMLModelEvaluationError,
    handleMLModelOptimizationError,
    handleMLModelValidationError,
    handleMLModelCrossValidationError,
    handleMLModelHyperparameterError,
    handleMLModelFeatureError,
    handleMLModelPreprocessingError,
    handleMLModelPostprocessingError,
    handleMLModelSerializationError,
    handleMLModelDeserializationError,
    handleMLModelVersioningError,
    handleMLModelDeploymentError,
    
    // Utility methods
    executeMLOperation,
    getMLErrorSummary,
    clearMLErrors,
    
    // Constants
    MACHINE_LEARNING_ERRORS
  }
}







