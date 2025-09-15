import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useTestingErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Testing specific error types
  const TESTING_ERRORS = {
    TEST_SETUP_FAILED: 'test-setup-failed',
    TEST_TEARDOWN_FAILED: 'test-teardown-failed',
    TEST_EXECUTION_FAILED: 'test-execution-failed',
    TEST_ASSERTION_FAILED: 'test-assertion-failed',
    TEST_MOCK_FAILED: 'test-mock-failed',
    TEST_STUB_FAILED: 'test-stub-failed',
    TEST_SPY_FAILED: 'test-spy-failed',
    TEST_FIXTURE_FAILED: 'test-fixture-failed',
    TEST_DATA_FAILED: 'test-data-failed',
    TEST_ENVIRONMENT_FAILED: 'test-environment-failed',
    TEST_CONFIGURATION_FAILED: 'test-configuration-failed',
    TEST_COVERAGE_FAILED: 'test-coverage-failed',
    TEST_REPORT_FAILED: 'test-report-failed',
    TEST_DEBUG_FAILED: 'test-debug-failed',
    TEST_PERFORMANCE_FAILED: 'test-performance-failed'
  }
  
  // Handle test setup errors
  function handleTestSetupError(error, testName, context = {}) {
    const errorContext = {
      operation: 'test-setup',
      testName,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_SETUP_FAILED,
      error,
      errorContext
    )
    
    // Test setup errors are usually non-critical
    console.warn(`Test setup failed for ${testName}:`, error)
  }
  
  // Handle test teardown errors
  function handleTestTeardownError(error, testName, context = {}) {
    const errorContext = {
      operation: 'test-teardown',
      testName,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_TEARDOWN_FAILED,
      error,
      errorContext
    )
    
    // Test teardown errors are usually non-critical
    console.warn(`Test teardown failed for ${testName}:`, error)
  }
  
  // Handle test execution errors
  function handleTestExecutionError(error, testName, context = {}) {
    const errorContext = {
      operation: 'test-execution',
      testName,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_EXECUTION_FAILED,
      error,
      errorContext
    )
    
    // Test execution errors are usually non-critical
    console.warn(`Test execution failed for ${testName}:`, error)
  }
  
  // Handle test assertion errors
  function handleTestAssertionError(error, testName, assertion, context = {}) {
    const errorContext = {
      operation: 'test-assertion',
      testName,
      assertion,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_ASSERTION_FAILED,
      error,
      errorContext
    )
    
    // Test assertion errors are usually non-critical
    console.warn(`Test assertion failed for ${testName}:`, assertion)
  }
  
  // Handle test mock errors
  function handleTestMockError(error, testName, mockName, context = {}) {
    const errorContext = {
      operation: 'test-mock',
      testName,
      mockName,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_MOCK_FAILED,
      error,
      errorContext
    )
    
    // Test mock errors are usually non-critical
    console.warn(`Test mock failed for ${testName}:`, mockName)
  }
  
  // Handle test stub errors
  function handleTestStubError(error, testName, stubName, context = {}) {
    const errorContext = {
      operation: 'test-stub',
      testName,
      stubName,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_STUB_FAILED,
      error,
      errorContext
    )
    
    // Test stub errors are usually non-critical
    console.warn(`Test stub failed for ${testName}:`, stubName)
  }
  
  // Handle test spy errors
  function handleTestSpyError(error, testName, spyName, context = {}) {
    const errorContext = {
      operation: 'test-spy',
      testName,
      spyName,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_SPY_FAILED,
      error,
      errorContext
    )
    
    // Test spy errors are usually non-critical
    console.warn(`Test spy failed for ${testName}:`, spyName)
  }
  
  // Handle test fixture errors
  function handleTestFixtureError(error, testName, fixtureName, context = {}) {
    const errorContext = {
      operation: 'test-fixture',
      testName,
      fixtureName,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_FIXTURE_FAILED,
      error,
      errorContext
    )
    
    // Test fixture errors are usually non-critical
    console.warn(`Test fixture failed for ${testName}:`, fixtureName)
  }
  
  // Handle test data errors
  function handleTestDataError(error, testName, dataType, context = {}) {
    const errorContext = {
      operation: 'test-data',
      testName,
      dataType,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_DATA_FAILED,
      error,
      errorContext
    )
    
    // Test data errors are usually non-critical
    console.warn(`Test data failed for ${testName}:`, dataType)
  }
  
  // Handle test environment errors
  function handleTestEnvironmentError(error, testName, environment, context = {}) {
    const errorContext = {
      operation: 'test-environment',
      testName,
      environment,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_ENVIRONMENT_FAILED,
      error,
      errorContext
    )
    
    // Test environment errors are usually non-critical
    console.warn(`Test environment failed for ${testName}:`, environment)
  }
  
  // Handle test configuration errors
  function handleTestConfigurationError(error, testName, config, context = {}) {
    const errorContext = {
      operation: 'test-configuration',
      testName,
      config,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_CONFIGURATION_FAILED,
      error,
      errorContext
    )
    
    // Test configuration errors are usually non-critical
    console.warn(`Test configuration failed for ${testName}:`, config)
  }
  
  // Handle test coverage errors
  function handleTestCoverageError(error, testName, coverage, context = {}) {
    const errorContext = {
      operation: 'test-coverage',
      testName,
      coverage,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_COVERAGE_FAILED,
      error,
      errorContext
    )
    
    // Test coverage errors are usually non-critical
    console.warn(`Test coverage failed for ${testName}:`, coverage)
  }
  
  // Handle test report errors
  function handleTestReportError(error, testName, reportType, context = {}) {
    const errorContext = {
      operation: 'test-report',
      testName,
      reportType,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_REPORT_FAILED,
      error,
      errorContext
    )
    
    // Test report errors are usually non-critical
    console.warn(`Test report failed for ${testName}:`, reportType)
  }
  
  // Handle test debug errors
  function handleTestDebugError(error, testName, debugInfo, context = {}) {
    const errorContext = {
      operation: 'test-debug',
      testName,
      debugInfo,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_DEBUG_FAILED,
      error,
      errorContext
    )
    
    // Test debug errors are usually non-critical
    console.warn(`Test debug failed for ${testName}:`, debugInfo)
  }
  
  // Handle test performance errors
  function handleTestPerformanceError(error, testName, performance, context = {}) {
    const errorContext = {
      operation: 'test-performance',
      testName,
      performance,
      ...context
    }
    
    errorHandling.addError(
      TESTING_ERRORS.TEST_PERFORMANCE_FAILED,
      error,
      errorContext
    )
    
    // Test performance errors are usually non-critical
    console.warn(`Test performance failed for ${testName}:`, performance)
  }
  
  // Execute testing operation with error handling
  async function executeTestingOperation(operation, operationFunction, context = {}) {
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
  
  // Get testing error summary
  function getTestingErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add testing specific analysis
    summary.testingErrors = {
      setupErrors: summary.errorTypes[TESTING_ERRORS.TEST_SETUP_FAILED] || 0,
      teardownErrors: summary.errorTypes[TESTING_ERRORS.TEST_TEARDOWN_FAILED] || 0,
      executionErrors: summary.errorTypes[TESTING_ERRORS.TEST_EXECUTION_FAILED] || 0,
      assertionErrors: summary.errorTypes[TESTING_ERRORS.TEST_ASSERTION_FAILED] || 0,
      mockErrors: summary.errorTypes[TESTING_ERRORS.TEST_MOCK_FAILED] || 0,
      stubErrors: summary.errorTypes[TESTING_ERRORS.TEST_STUB_FAILED] || 0,
      spyErrors: summary.errorTypes[TESTING_ERRORS.TEST_SPY_FAILED] || 0,
      fixtureErrors: summary.errorTypes[TESTING_ERRORS.TEST_FIXTURE_FAILED] || 0,
      dataErrors: summary.errorTypes[TESTING_ERRORS.TEST_DATA_FAILED] || 0,
      environmentErrors: summary.errorTypes[TESTING_ERRORS.TEST_ENVIRONMENT_FAILED] || 0,
      configurationErrors: summary.errorTypes[TESTING_ERRORS.TEST_CONFIGURATION_FAILED] || 0,
      coverageErrors: summary.errorTypes[TESTING_ERRORS.TEST_COVERAGE_FAILED] || 0,
      reportErrors: summary.errorTypes[TESTING_ERRORS.TEST_REPORT_FAILED] || 0,
      debugErrors: summary.errorTypes[TESTING_ERRORS.TEST_DEBUG_FAILED] || 0,
      performanceErrors: summary.errorTypes[TESTING_ERRORS.TEST_PERFORMANCE_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear testing errors
  function clearTestingErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Testing specific methods
    handleTestSetupError,
    handleTestTeardownError,
    handleTestExecutionError,
    handleTestAssertionError,
    handleTestMockError,
    handleTestStubError,
    handleTestSpyError,
    handleTestFixtureError,
    handleTestDataError,
    handleTestEnvironmentError,
    handleTestConfigurationError,
    handleTestCoverageError,
    handleTestReportError,
    handleTestDebugError,
    handleTestPerformanceError,
    
    // Utility methods
    executeTestingOperation,
    getTestingErrorSummary,
    clearTestingErrors,
    
    // Constants
    TESTING_ERRORS
  }
}


