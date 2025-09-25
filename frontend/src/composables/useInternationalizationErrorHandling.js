import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useInternationalizationErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Internationalization specific error types
  const I18N_ERRORS = {
    LOCALE_LOAD_FAILED: 'locale-load-failed',
    LOCALE_SWITCH_FAILED: 'locale-switch-failed',
    TRANSLATION_MISSING: 'translation-missing',
    TRANSLATION_INVALID: 'translation-invalid',
    TRANSLATION_FORMAT_FAILED: 'translation-format-failed',
    PLURALIZATION_FAILED: 'pluralization-failed',
    DATE_FORMAT_FAILED: 'date-format-failed',
    NUMBER_FORMAT_FAILED: 'number-format-failed',
    CURRENCY_FORMAT_FAILED: 'currency-format-failed',
    TIME_FORMAT_FAILED: 'time-format-failed',
    RTL_LAYOUT_FAILED: 'rtl-layout-failed',
    FONT_LOAD_FAILED: 'font-load-failed',
    TEXT_DIRECTION_FAILED: 'text-direction-failed',
    CULTURAL_FORMAT_FAILED: 'cultural-format-failed',
    TIMEZONE_CONVERSION_FAILED: 'timezone-conversion-failed'
  }
  
  // Handle locale load errors
  function handleLocaleLoadError(error, locale, context = {}) {
    const errorContext = {
      operation: 'locale-load',
      locale,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.LOCALE_LOAD_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Failed to load locale: ${locale}. Using default locale.`
    )
  }
  
  // Handle locale switch errors
  function handleLocaleSwitchError(error, fromLocale, toLocale, context = {}) {
    const errorContext = {
      operation: 'locale-switch',
      fromLocale,
      toLocale,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.LOCALE_SWITCH_FAILED,
      error,
      errorContext
    )
    
    notificationStore.addError(
      `Failed to switch from ${fromLocale} to ${toLocale}. Keeping current locale.`
    )
  }
  
  // Handle translation missing errors
  function handleTranslationMissingError(error, key, locale, context = {}) {
    const errorContext = {
      operation: 'translation-missing',
      key,
      locale,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.TRANSLATION_MISSING,
      error,
      errorContext
    )
    
    // Translation missing errors are usually non-critical
    console.warn(`Translation missing for key ${key} in locale ${locale}`)
  }
  
  // Handle translation invalid errors
  function handleTranslationInvalidError(error, key, locale, translation, context = {}) {
    const errorContext = {
      operation: 'translation-invalid',
      key,
      locale,
      translation,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.TRANSLATION_INVALID,
      error,
      errorContext
    )
    
    // Translation invalid errors are usually non-critical
    console.warn(`Invalid translation for key ${key} in locale ${locale}:`, translation)
  }
  
  // Handle translation format errors
  function handleTranslationFormatError(error, key, locale, format, context = {}) {
    const errorContext = {
      operation: 'translation-format',
      key,
      locale,
      format,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.TRANSLATION_FORMAT_FAILED,
      error,
      errorContext
    )
    
    // Translation format errors are usually non-critical
    console.warn(`Translation format failed for key ${key} in locale ${locale}:`, format)
  }
  
  // Handle pluralization errors
  function handlePluralizationError(error, key, locale, count, context = {}) {
    const errorContext = {
      operation: 'pluralization',
      key,
      locale,
      count,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.PLURALIZATION_FAILED,
      error,
      errorContext
    )
    
    // Pluralization errors are usually non-critical
    console.warn(`Pluralization failed for key ${key} in locale ${locale} with count ${count}`)
  }
  
  // Handle date format errors
  function handleDateFormatError(error, date, locale, format, context = {}) {
    const errorContext = {
      operation: 'date-format',
      date,
      locale,
      format,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.DATE_FORMAT_FAILED,
      error,
      errorContext
    )
    
    // Date format errors are usually non-critical
    console.warn(`Date format failed for ${date} in locale ${locale}:`, format)
  }
  
  // Handle number format errors
  function handleNumberFormatError(error, number, locale, format, context = {}) {
    const errorContext = {
      operation: 'number-format',
      number,
      locale,
      format,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.NUMBER_FORMAT_FAILED,
      error,
      errorContext
    )
    
    // Number format errors are usually non-critical
    console.warn(`Number format failed for ${number} in locale ${locale}:`, format)
  }
  
  // Handle currency format errors
  function handleCurrencyFormatError(error, amount, locale, currency, context = {}) {
    const errorContext = {
      operation: 'currency-format',
      amount,
      locale,
      currency,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.CURRENCY_FORMAT_FAILED,
      error,
      errorContext
    )
    
    // Currency format errors are usually non-critical
    console.warn(`Currency format failed for ${amount} ${currency} in locale ${locale}`)
  }
  
  // Handle time format errors
  function handleTimeFormatError(error, time, locale, format, context = {}) {
    const errorContext = {
      operation: 'time-format',
      time,
      locale,
      format,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.TIME_FORMAT_FAILED,
      error,
      errorContext
    )
    
    // Time format errors are usually non-critical
    console.warn(`Time format failed for ${time} in locale ${locale}:`, format)
  }
  
  // Handle RTL layout errors
  function handleRTLLayoutError(error, locale, context = {}) {
    const errorContext = {
      operation: 'rtl-layout',
      locale,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.RTL_LAYOUT_FAILED,
      error,
      errorContext
    )
    
    // RTL layout errors are usually non-critical
    console.warn(`RTL layout failed for locale ${locale}:`, error)
  }
  
  // Handle font load errors
  function handleFontLoadError(error, fontFamily, locale, context = {}) {
    const errorContext = {
      operation: 'font-load',
      fontFamily,
      locale,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.FONT_LOAD_FAILED,
      error,
      errorContext
    )
    
    // Font load errors are usually non-critical
    console.warn(`Font load failed for ${fontFamily} in locale ${locale}:`, error)
  }
  
  // Handle text direction errors
  function handleTextDirectionError(error, text, locale, context = {}) {
    const errorContext = {
      operation: 'text-direction',
      text,
      locale,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.TEXT_DIRECTION_FAILED,
      error,
      errorContext
    )
    
    // Text direction errors are usually non-critical
    console.warn(`Text direction failed for text in locale ${locale}:`, error)
  }
  
  // Handle cultural format errors
  function handleCulturalFormatError(error, value, locale, formatType, context = {}) {
    const errorContext = {
      operation: 'cultural-format',
      value,
      locale,
      formatType,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.CULTURAL_FORMAT_FAILED,
      error,
      errorContext
    )
    
    // Cultural format errors are usually non-critical
    console.warn(`Cultural format failed for ${formatType} in locale ${locale}:`, error)
  }
  
  // Handle timezone conversion errors
  function handleTimezoneConversionError(error, date, fromTimezone, toTimezone, context = {}) {
    const errorContext = {
      operation: 'timezone-conversion',
      date,
      fromTimezone,
      toTimezone,
      ...context
    }
    
    errorHandling.addError(
      I18N_ERRORS.TIMEZONE_CONVERSION_FAILED,
      error,
      errorContext
    )
    
    // Timezone conversion errors are usually non-critical
    console.warn(`Timezone conversion failed from ${fromTimezone} to ${toTimezone}:`, error)
  }
  
  // Execute internationalization operation with error handling
  async function executeInternationalizationOperation(operation, operationFunction, context = {}) {
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
  
  // Get internationalization error summary
  function getInternationalizationErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add internationalization specific analysis
    summary.internationalizationErrors = {
      localeLoadErrors: summary.errorTypes[I18N_ERRORS.LOCALE_LOAD_FAILED] || 0,
      localeSwitchErrors: summary.errorTypes[I18N_ERRORS.LOCALE_SWITCH_FAILED] || 0,
      translationMissingErrors: summary.errorTypes[I18N_ERRORS.TRANSLATION_MISSING] || 0,
      translationInvalidErrors: summary.errorTypes[I18N_ERRORS.TRANSLATION_INVALID] || 0,
      translationFormatErrors: summary.errorTypes[I18N_ERRORS.TRANSLATION_FORMAT_FAILED] || 0,
      pluralizationErrors: summary.errorTypes[I18N_ERRORS.PLURALIZATION_FAILED] || 0,
      dateFormatErrors: summary.errorTypes[I18N_ERRORS.DATE_FORMAT_FAILED] || 0,
      numberFormatErrors: summary.errorTypes[I18N_ERRORS.NUMBER_FORMAT_FAILED] || 0,
      currencyFormatErrors: summary.errorTypes[I18N_ERRORS.CURRENCY_FORMAT_FAILED] || 0,
      timeFormatErrors: summary.errorTypes[I18N_ERRORS.TIME_FORMAT_FAILED] || 0,
      rtlLayoutErrors: summary.errorTypes[I18N_ERRORS.RTL_LAYOUT_FAILED] || 0,
      fontLoadErrors: summary.errorTypes[I18N_ERRORS.FONT_LOAD_FAILED] || 0,
      textDirectionErrors: summary.errorTypes[I18N_ERRORS.TEXT_DIRECTION_FAILED] || 0,
      culturalFormatErrors: summary.errorTypes[I18N_ERRORS.CULTURAL_FORMAT_FAILED] || 0,
      timezoneConversionErrors: summary.errorTypes[I18N_ERRORS.TIMEZONE_CONVERSION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear internationalization errors
  function clearInternationalizationErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Internationalization specific methods
    handleLocaleLoadError,
    handleLocaleSwitchError,
    handleTranslationMissingError,
    handleTranslationInvalidError,
    handleTranslationFormatError,
    handlePluralizationError,
    handleDateFormatError,
    handleNumberFormatError,
    handleCurrencyFormatError,
    handleTimeFormatError,
    handleRTLLayoutError,
    handleFontLoadError,
    handleTextDirectionError,
    handleCulturalFormatError,
    handleTimezoneConversionError,
    
    // Utility methods
    executeInternationalizationOperation,
    getInternationalizationErrorSummary,
    clearInternationalizationErrors,
    
    // Constants
    I18N_ERRORS
  }
}








