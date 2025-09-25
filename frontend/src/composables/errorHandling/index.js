// Error Handling Composables Index
// This file exports all error handling composables for easy importing

// Core error handling
export { useErrorHandling } from '../useErrorHandling'

// Feature-specific error handling
export { useManageModeErrorHandling } from '../useManageModeErrorHandling'
export { useSessionManagerErrorHandling } from '../useSessionManagerErrorHandling'
export { useBulkOperationErrorHandling } from '../useBulkOperationErrorHandling'
export { useUIErrorHandling } from '../useUIErrorHandling'
export { useAPIErrorHandling } from '../useAPIErrorHandling'
export { useNotificationErrorHandling } from '../useNotificationErrorHandling'
export { useStateManagementErrorHandling } from '../useStateManagementErrorHandling'
export { useWebSocketErrorHandling } from '../useWebSocketErrorHandling'
export { useFileOperationErrorHandling } from '../useFileOperationErrorHandling'
export { useKeyboardNavigationErrorHandling } from '../useKeyboardNavigationErrorHandling'
export { useAnimationErrorHandling } from '../useAnimationErrorHandling'
export { useAccessibilityErrorHandling } from '../useAccessibilityErrorHandling'
export { usePerformanceErrorHandling } from '../usePerformanceErrorHandling'
export { useSecurityErrorHandling } from '../useSecurityErrorHandling'
export { useInternationalizationErrorHandling } from '../useInternationalizationErrorHandling'
export { useTestingErrorHandling } from '../useTestingErrorHandling'
export { useLoggingErrorHandling } from '../useLoggingErrorHandling'
export { useMonitoringErrorHandling } from '../useMonitoringErrorHandling'
export { useCachingErrorHandling } from '../useCachingErrorHandling'
export { useValidationErrorHandling } from '../useValidationErrorHandling'
export { useRoutingErrorHandling } from '../useRoutingErrorHandling'
export { useStorageErrorHandling } from '../useStorageErrorHandling'
export { useUtilityErrorHandling } from '../useUtilityErrorHandling'
export { useEventHandlingErrorHandling } from '../useEventHandlingErrorHandling'
export { useDataProcessingErrorHandling } from '../useDataProcessingErrorHandling'
export { useUIStateErrorHandling } from '../useUIStateErrorHandling'
export { useComponentLifecycleErrorHandling } from '../useComponentLifecycleErrorHandling'
export { usePluginSystemErrorHandling } from '../usePluginSystemErrorHandling'
export { useMiddlewareErrorHandling } from '../useMiddlewareErrorHandling'
export { useServiceWorkerErrorHandling } from '../useServiceWorkerErrorHandling'
export { useProgressiveWebAppErrorHandling } from '../useProgressiveWebAppErrorHandling'
export { useOfflineErrorHandling } from '../useOfflineErrorHandling'
export { useRealTimeErrorHandling } from '../useRealTimeErrorHandling'
export { useAnalyticsErrorHandling } from '../useAnalyticsErrorHandling'

// Advanced technology error handling
export { useMachineLearningErrorHandling } from '../useMachineLearningErrorHandling'
export { useBlockchainErrorHandling } from '../useBlockchainErrorHandling'
export { useQuantumComputingErrorHandling } from '../useQuantumComputingErrorHandling'
export { useEdgeComputingErrorHandling } from '../useEdgeComputingErrorHandling'
export { useAugmentedRealityErrorHandling } from '../useAugmentedRealityErrorHandling'
export { useVirtualRealityErrorHandling } from '../useVirtualRealityErrorHandling'
export { useMixedRealityErrorHandling } from '../useMixedRealityErrorHandling'
export { useComputerVisionErrorHandling } from '../useComputerVisionErrorHandling'
export { useNaturalLanguageProcessingErrorHandling } from '../useNaturalLanguageProcessingErrorHandling'
export { useSpeechRecognitionErrorHandling } from '../useSpeechRecognitionErrorHandling'
export { useTextToSpeechErrorHandling } from '../useTextToSpeechErrorHandling'
export { useVoiceRecognitionErrorHandling } from '../useVoiceRecognitionErrorHandling'
export { useGestureRecognitionErrorHandling } from '../useGestureRecognitionErrorHandling'
export { useFacialRecognitionErrorHandling } from '../useFacialRecognitionErrorHandling'
export { useObjectRecognitionErrorHandling } from '../useObjectRecognitionErrorHandling'
export { useSceneUnderstandingErrorHandling } from '../useSceneUnderstandingErrorHandling'
export { useMotionTrackingErrorHandling } from '../useMotionTrackingErrorHandling'
export { useDepthSensingErrorHandling } from '../useDepthSensingErrorHandling'
export { useSpatialMappingErrorHandling } from '../useSpatialMappingErrorHandling'
export { useHapticFeedbackErrorHandling } from '../useHapticFeedbackErrorHandling'

// Error handling utilities
export const ERROR_CATEGORIES = {
  CORE: 'core',
  FEATURE: 'feature',
  ADVANCED: 'advanced',
  UI: 'ui',
  API: 'api',
  DATA: 'data',
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  ACCESSIBILITY: 'accessibility'
}

export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

export const ERROR_TYPES = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  PERMISSION: 'permission',
  TIMEOUT: 'timeout',
  RESOURCE: 'resource',
  LOGIC: 'logic',
  SYSTEM: 'system',
  USER: 'user'
}

// Helper function to get all error handling composables
export function getAllErrorHandlingComposables() {
  return {
    // Core
    useErrorHandling,
    
    // Feature-specific
    useManageModeErrorHandling,
    useSessionManagerErrorHandling,
    useBulkOperationErrorHandling,
    useUIErrorHandling,
    useAPIErrorHandling,
    useNotificationErrorHandling,
    useStateManagementErrorHandling,
    useWebSocketErrorHandling,
    useFileOperationErrorHandling,
    useKeyboardNavigationErrorHandling,
    useAnimationErrorHandling,
    useAccessibilityErrorHandling,
    usePerformanceErrorHandling,
    useSecurityErrorHandling,
    useInternationalizationErrorHandling,
    useTestingErrorHandling,
    useLoggingErrorHandling,
    useMonitoringErrorHandling,
    useCachingErrorHandling,
    useValidationErrorHandling,
    useRoutingErrorHandling,
    useStorageErrorHandling,
    useUtilityErrorHandling,
    useEventHandlingErrorHandling,
    useDataProcessingErrorHandling,
    useUIStateErrorHandling,
    useComponentLifecycleErrorHandling,
    usePluginSystemErrorHandling,
    useMiddlewareErrorHandling,
    useServiceWorkerErrorHandling,
    useProgressiveWebAppErrorHandling,
    useOfflineErrorHandling,
    useRealTimeErrorHandling,
    useAnalyticsErrorHandling,
    
    // Advanced technology
    useMachineLearningErrorHandling,
    useBlockchainErrorHandling,
    useQuantumComputingErrorHandling,
    useEdgeComputingErrorHandling,
    useAugmentedRealityErrorHandling,
    useVirtualRealityErrorHandling,
    useMixedRealityErrorHandling,
    useComputerVisionErrorHandling,
    useNaturalLanguageProcessingErrorHandling,
    useSpeechRecognitionErrorHandling,
    useTextToSpeechErrorHandling,
    useVoiceRecognitionErrorHandling,
    useGestureRecognitionErrorHandling,
    useFacialRecognitionErrorHandling,
    useObjectRecognitionErrorHandling,
    useSceneUnderstandingErrorHandling,
    useMotionTrackingErrorHandling,
    useDepthSensingErrorHandling,
    useSpatialMappingErrorHandling,
    useHapticFeedbackErrorHandling
  }
}

// Helper function to create a comprehensive error handler
export function createComprehensiveErrorHandler() {
  const coreErrorHandler = useErrorHandling()
  
  return {
    ...coreErrorHandler,
    
    // Add all feature-specific error handlers
    manageMode: useManageModeErrorHandling(),
    sessionManager: useSessionManagerErrorHandling(),
    bulkOperation: useBulkOperationErrorHandling(),
    ui: useUIErrorHandling(),
    api: useAPIErrorHandling(),
    notification: useNotificationErrorHandling(),
    stateManagement: useStateManagementErrorHandling(),
    webSocket: useWebSocketErrorHandling(),
    fileOperation: useFileOperationErrorHandling(),
    keyboardNavigation: useKeyboardNavigationErrorHandling(),
    animation: useAnimationErrorHandling(),
    accessibility: useAccessibilityErrorHandling(),
    performance: usePerformanceErrorHandling(),
    security: useSecurityErrorHandling(),
    internationalization: useInternationalizationErrorHandling(),
    testing: useTestingErrorHandling(),
    logging: useLoggingErrorHandling(),
    monitoring: useMonitoringErrorHandling(),
    caching: useCachingErrorHandling(),
    validation: useValidationErrorHandling(),
    routing: useRoutingErrorHandling(),
    storage: useStorageErrorHandling(),
    utility: useUtilityErrorHandling(),
    eventHandling: useEventHandlingErrorHandling(),
    dataProcessing: useDataProcessingErrorHandling(),
    uiState: useUIStateErrorHandling(),
    componentLifecycle: useComponentLifecycleErrorHandling(),
    pluginSystem: usePluginSystemErrorHandling(),
    middleware: useMiddlewareErrorHandling(),
    serviceWorker: useServiceWorkerErrorHandling(),
    progressiveWebApp: useProgressiveWebAppErrorHandling(),
    offline: useOfflineErrorHandling(),
    realTime: useRealTimeErrorHandling(),
    analytics: useAnalyticsErrorHandling(),
    
    // Advanced technology error handlers
    machineLearning: useMachineLearningErrorHandling(),
    blockchain: useBlockchainErrorHandling(),
    quantumComputing: useQuantumComputingErrorHandling(),
    edgeComputing: useEdgeComputingErrorHandling(),
    augmentedReality: useAugmentedRealityErrorHandling(),
    virtualReality: useVirtualRealityErrorHandling(),
    mixedReality: useMixedRealityErrorHandling(),
    computerVision: useComputerVisionErrorHandling(),
    naturalLanguageProcessing: useNaturalLanguageProcessingErrorHandling(),
    speechRecognition: useSpeechRecognitionErrorHandling(),
    textToSpeech: useTextToSpeechErrorHandling(),
    voiceRecognition: useVoiceRecognitionErrorHandling(),
    gestureRecognition: useGestureRecognitionErrorHandling(),
    facialRecognition: useFacialRecognitionErrorHandling(),
    objectRecognition: useObjectRecognitionErrorHandling(),
    sceneUnderstanding: useSceneUnderstandingErrorHandling(),
    motionTracking: useMotionTrackingErrorHandling(),
    depthSensing: useDepthSensingErrorHandling(),
    spatialMapping: useSpatialMappingErrorHandling(),
    hapticFeedback: useHapticFeedbackErrorHandling()
  }
}








