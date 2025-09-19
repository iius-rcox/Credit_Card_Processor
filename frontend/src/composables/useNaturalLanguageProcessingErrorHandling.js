import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useNaturalLanguageProcessingErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Natural language processing specific error types
  const NATURAL_LANGUAGE_PROCESSING_ERRORS = {
    NLP_TOKENIZATION_FAILED: 'nlp-tokenization-failed',
    NLP_PARSING_FAILED: 'nlp-parsing-failed',
    NLP_LEMMATIZATION_FAILED: 'nlp-lemmatization-failed',
    NLP_STEMMING_FAILED: 'nlp-stemming-failed',
    NLP_POS_FAILED: 'nlp-pos-failed',
    NLP_NER_FAILED: 'nlp-ner-failed',
    NLP_SENTIMENT_FAILED: 'nlp-sentiment-failed',
    NLP_CLASSIFICATION_FAILED: 'nlp-classification-failed',
    NLP_SUMMARIZATION_FAILED: 'nlp-summarization-failed',
    NLP_TRANSLATION_FAILED: 'nlp-translation-failed',
    NLP_QUESTION_FAILED: 'nlp-question-failed',
    NLP_ANSWER_FAILED: 'nlp-answer-failed',
    NLP_DIALOGUE_FAILED: 'nlp-dialogue-failed',
    NLP_GENERATION_FAILED: 'nlp-generation-failed',
    NLP_EMBEDDING_FAILED: 'nlp-embedding-failed',
    NLP_SIMILARITY_FAILED: 'nlp-similarity-failed'
  }
  
  // Handle NLP tokenization errors
  function handleNLPTokenizationError(error, tokenization, context = {}) {
    const errorContext = {
      operation: 'nlp-tokenization',
      tokenization,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_TOKENIZATION_FAILED,
      error,
      errorContext
    }
    
    // NLP tokenization errors are usually non-critical
    console.warn(`NLP tokenization failed:`, tokenization)
  }
  
  // Handle NLP parsing errors
  function handleNLPParsingError(error, parsing, context = {}) {
    const errorContext = {
      operation: 'nlp-parsing',
      parsing,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_PARSING_FAILED,
      error,
      errorContext
    }
    
    // NLP parsing errors are usually non-critical
    console.warn(`NLP parsing failed:`, parsing)
  }
  
  // Handle NLP lemmatization errors
  function handleNLPLemmatizationError(error, lemmatization, context = {}) {
    const errorContext = {
      operation: 'nlp-lemmatization',
      lemmatization,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_LEMMATIZATION_FAILED,
      error,
      errorContext
    }
    
    // NLP lemmatization errors are usually non-critical
    console.warn(`NLP lemmatization failed:`, lemmatization)
  }
  
  // Handle NLP stemming errors
  function handleNLPStemmingError(error, stemming, context = {}) {
    const errorContext = {
      operation: 'nlp-stemming',
      stemming,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_STEMMING_FAILED,
      error,
      errorContext
    }
    
    // NLP stemming errors are usually non-critical
    console.warn(`NLP stemming failed:`, stemming)
  }
  
  // Handle NLP POS errors
  function handleNLPPOSError(error, pos, context = {}) {
    const errorContext = {
      operation: 'nlp-pos',
      pos,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_POS_FAILED,
      error,
      errorContext
    }
    
    // NLP POS errors are usually non-critical
    console.warn(`NLP POS failed:`, pos)
  }
  
  // Handle NLP NER errors
  function handleNLPNERError(error, ner, context = {}) {
    const errorContext = {
      operation: 'nlp-ner',
      ner,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_NER_FAILED,
      error,
      errorContext
    }
    
    // NLP NER errors are usually non-critical
    console.warn(`NLP NER failed:`, ner)
  }
  
  // Handle NLP sentiment errors
  function handleNLPSentimentError(error, sentiment, context = {}) {
    const errorContext = {
      operation: 'nlp-sentiment',
      sentiment,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_SENTIMENT_FAILED,
      error,
      errorContext
    }
    
    // NLP sentiment errors are usually non-critical
    console.warn(`NLP sentiment failed:`, sentiment)
  }
  
  // Handle NLP classification errors
  function handleNLPClassificationError(error, classification, context = {}) {
    const errorContext = {
      operation: 'nlp-classification',
      classification,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_CLASSIFICATION_FAILED,
      error,
      errorContext
    }
    
    // NLP classification errors are usually non-critical
    console.warn(`NLP classification failed:`, classification)
  }
  
  // Handle NLP summarization errors
  function handleNLPSummarizationError(error, summarization, context = {}) {
    const errorContext = {
      operation: 'nlp-summarization',
      summarization,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_SUMMARIZATION_FAILED,
      error,
      errorContext
    }
    
    // NLP summarization errors are usually non-critical
    console.warn(`NLP summarization failed:`, summarization)
  }
  
  // Handle NLP translation errors
  function handleNLPTranslationError(error, translation, context = {}) {
    const errorContext = {
      operation: 'nlp-translation',
      translation,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_TRANSLATION_FAILED,
      error,
      errorContext
    }
    
    // NLP translation errors are usually non-critical
    console.warn(`NLP translation failed:`, translation)
  }
  
  // Handle NLP question errors
  function handleNLPQuestionError(error, question, context = {}) {
    const errorContext = {
      operation: 'nlp-question',
      question,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_QUESTION_FAILED,
      error,
      errorContext
    }
    
    // NLP question errors are usually non-critical
    console.warn(`NLP question failed:`, question)
  }
  
  // Handle NLP answer errors
  function handleNLPAnswerError(error, answer, context = {}) {
    const errorContext = {
      operation: 'nlp-answer',
      answer,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_ANSWER_FAILED,
      error,
      errorContext
    }
    
    // NLP answer errors are usually non-critical
    console.warn(`NLP answer failed:`, answer)
  }
  
  // Handle NLP dialogue errors
  function handleNLPDialogueError(error, dialogue, context = {}) {
    const errorContext = {
      operation: 'nlp-dialogue',
      dialogue,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_DIALOGUE_FAILED,
      error,
      errorContext
    }
    
    // NLP dialogue errors are usually non-critical
    console.warn(`NLP dialogue failed:`, dialogue)
  }
  
  // Handle NLP generation errors
  function handleNLPGenerationError(error, generation, context = {}) {
    const errorContext = {
      operation: 'nlp-generation',
      generation,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_GENERATION_FAILED,
      error,
      errorContext
    }
    
    // NLP generation errors are usually non-critical
    console.warn(`NLP generation failed:`, generation)
  }
  
  // Handle NLP embedding errors
  function handleNLPEmbeddingError(error, embedding, context = {}) {
    const errorContext = {
      operation: 'nlp-embedding',
      embedding,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_EMBEDDING_FAILED,
      error,
      errorContext
    }
    
    // NLP embedding errors are usually non-critical
    console.warn(`NLP embedding failed:`, embedding)
  }
  
  // Handle NLP similarity errors
  function handleNLPSimilarityError(error, similarity, context = {}) {
    const errorContext = {
      operation: 'nlp-similarity',
      similarity,
      ...context
    }
    
    errorHandling.addError(
      NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_SIMILARITY_FAILED,
      error,
      errorContext
    }
    
    // NLP similarity errors are usually non-critical
    console.warn(`NLP similarity failed:`, similarity)
  }
  
  // Execute NLP operation with error handling
  async function executeNLPOperation(operation, operationFunction, context = {}) {
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
  
  // Get NLP error summary
  function getNLPErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add NLP specific analysis
    summary.nlpErrors = {
      tokenizationErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_TOKENIZATION_FAILED] || 0,
      parsingErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_PARSING_FAILED] || 0,
      lemmatizationErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_LEMMATIZATION_FAILED] || 0,
      stemmingErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_STEMMING_FAILED] || 0,
      posErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_POS_FAILED] || 0,
      nerErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_NER_FAILED] || 0,
      sentimentErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_SENTIMENT_FAILED] || 0,
      classificationErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_CLASSIFICATION_FAILED] || 0,
      summarizationErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_SUMMARIZATION_FAILED] || 0,
      translationErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_TRANSLATION_FAILED] || 0,
      questionErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_QUESTION_FAILED] || 0,
      answerErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_ANSWER_FAILED] || 0,
      dialogueErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_DIALOGUE_FAILED] || 0,
      generationErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_GENERATION_FAILED] || 0,
      embeddingErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_EMBEDDING_FAILED] || 0,
      similarityErrors: summary.errorTypes[NATURAL_LANGUAGE_PROCESSING_ERRORS.NLP_SIMILARITY_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear NLP errors
  function clearNLPErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // NLP specific methods
    handleNLPTokenizationError,
    handleNLPParsingError,
    handleNLPLemmatizationError,
    handleNLPStemmingError,
    handleNLPPOSError,
    handleNLPNERError,
    handleNLPSentimentError,
    handleNLPClassificationError,
    handleNLPSummarizationError,
    handleNLPTranslationError,
    handleNLPQuestionError,
    handleNLPAnswerError,
    handleNLPDialogueError,
    handleNLPGenerationError,
    handleNLPEmbeddingError,
    handleNLPSimilarityError,
    
    // Utility methods
    executeNLPOperation,
    getNLPErrorSummary,
    clearNLPErrors,
    
    // Constants
    NATURAL_LANGUAGE_PROCESSING_ERRORS
  }
}




