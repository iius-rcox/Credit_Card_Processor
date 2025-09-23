import { useErrorHandling } from './useErrorHandling'
import { useNotificationStore } from '@/stores/notification'

export function useBlockchainErrorHandling() {
  const errorHandling = useErrorHandling()
  const notificationStore = useNotificationStore()
  
  // Blockchain specific error types
  const BLOCKCHAIN_ERRORS = {
    BLOCKCHAIN_CONNECTION_FAILED: 'blockchain-connection-failed',
    BLOCKCHAIN_TRANSACTION_FAILED: 'blockchain-transaction-failed',
    BLOCKCHAIN_SMART_CONTRACT_FAILED: 'blockchain-smart-contract-failed',
    BLOCKCHAIN_WALLET_FAILED: 'blockchain-wallet-failed',
    BLOCKCHAIN_NETWORK_FAILED: 'blockchain-network-failed',
    BLOCKCHAIN_CONSENSUS_FAILED: 'blockchain-consensus-failed',
    BLOCKCHAIN_MINING_FAILED: 'blockchain-mining-failed',
    BLOCKCHAIN_VALIDATION_FAILED: 'blockchain-validation-failed',
    BLOCKCHAIN_SYNC_FAILED: 'blockchain-sync-failed',
    BLOCKCHAIN_FORK_FAILED: 'blockchain-fork-failed',
    BLOCKCHAIN_REORG_FAILED: 'blockchain-reorg-failed',
    BLOCKCHAIN_MERKLE_FAILED: 'blockchain-merkle-failed',
    BLOCKCHAIN_HASH_FAILED: 'blockchain-hash-failed',
    BLOCKCHAIN_SIGNATURE_FAILED: 'blockchain-signature-failed',
    BLOCKCHAIN_ENCRYPTION_FAILED: 'blockchain-encryption-failed',
    BLOCKCHAIN_DECRYPTION_FAILED: 'blockchain-decryption-failed'
  }
  
  // Handle blockchain connection errors
  function handleBlockchainConnectionError(error, network, context = {}) {
    const errorContext = {
      operation: 'blockchain-connection',
      network,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_CONNECTION_FAILED,
      error,
      errorContext
    }
    
    // Blockchain connection errors are usually non-critical
    console.warn(`Blockchain connection failed for ${network}:`, error)
  }
  
  // Handle blockchain transaction errors
  function handleBlockchainTransactionError(error, transaction, context = {}) {
    const errorContext = {
      operation: 'blockchain-transaction',
      transaction,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_TRANSACTION_FAILED,
      error,
      errorContext
    }
    
    // Blockchain transaction errors are usually non-critical
    console.warn(`Blockchain transaction failed:`, transaction)
  }
  
  // Handle blockchain smart contract errors
  function handleBlockchainSmartContractError(error, contract, context = {}) {
    const errorContext = {
      operation: 'blockchain-smart-contract',
      contract,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_SMART_CONTRACT_FAILED,
      error,
      errorContext
    }
    
    // Blockchain smart contract errors are usually non-critical
    console.warn(`Blockchain smart contract failed:`, contract)
  }
  
  // Handle blockchain wallet errors
  function handleBlockchainWalletError(error, wallet, context = {}) {
    const errorContext = {
      operation: 'blockchain-wallet',
      wallet,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_WALLET_FAILED,
      error,
      errorContext
    }
    
    // Blockchain wallet errors are usually non-critical
    console.warn(`Blockchain wallet failed:`, wallet)
  }
  
  // Handle blockchain network errors
  function handleBlockchainNetworkError(error, network, context = {}) {
    const errorContext = {
      operation: 'blockchain-network',
      network,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_NETWORK_FAILED,
      error,
      errorContext
    }
    
    // Blockchain network errors are usually non-critical
    console.warn(`Blockchain network failed for ${network}:`, error)
  }
  
  // Handle blockchain consensus errors
  function handleBlockchainConsensusError(error, consensus, context = {}) {
    const errorContext = {
      operation: 'blockchain-consensus',
      consensus,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_CONSENSUS_FAILED,
      error,
      errorContext
    }
    
    // Blockchain consensus errors are usually non-critical
    console.warn(`Blockchain consensus failed:`, consensus)
  }
  
  // Handle blockchain mining errors
  function handleBlockchainMiningError(error, mining, context = {}) {
    const errorContext = {
      operation: 'blockchain-mining',
      mining,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_MINING_FAILED,
      error,
      errorContext
    }
    
    // Blockchain mining errors are usually non-critical
    console.warn(`Blockchain mining failed:`, mining)
  }
  
  // Handle blockchain validation errors
  function handleBlockchainValidationError(error, validation, context = {}) {
    const errorContext = {
      operation: 'blockchain-validation',
      validation,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_VALIDATION_FAILED,
      error,
      errorContext
    }
    
    // Blockchain validation errors are usually non-critical
    console.warn(`Blockchain validation failed:`, validation)
  }
  
  // Handle blockchain sync errors
  function handleBlockchainSyncError(error, sync, context = {}) {
    const errorContext = {
      operation: 'blockchain-sync',
      sync,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_SYNC_FAILED,
      error,
      errorContext
    }
    
    // Blockchain sync errors are usually non-critical
    console.warn(`Blockchain sync failed:`, sync)
  }
  
  // Handle blockchain fork errors
  function handleBlockchainForkError(error, fork, context = {}) {
    const errorContext = {
      operation: 'blockchain-fork',
      fork,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_FORK_FAILED,
      error,
      errorContext
    }
    
    // Blockchain fork errors are usually non-critical
    console.warn(`Blockchain fork failed:`, fork)
  }
  
  // Handle blockchain reorg errors
  function handleBlockchainReorgError(error, reorg, context = {}) {
    const errorContext = {
      operation: 'blockchain-reorg',
      reorg,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_REORG_FAILED,
      error,
      errorContext
    }
    
    // Blockchain reorg errors are usually non-critical
    console.warn(`Blockchain reorg failed:`, reorg)
  }
  
  // Handle blockchain merkle errors
  function handleBlockchainMerkleError(error, merkle, context = {}) {
    const errorContext = {
      operation: 'blockchain-merkle',
      merkle,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_MERKLE_FAILED,
      error,
      errorContext
    }
    
    // Blockchain merkle errors are usually non-critical
    console.warn(`Blockchain merkle failed:`, merkle)
  }
  
  // Handle blockchain hash errors
  function handleBlockchainHashError(error, hash, context = {}) {
    const errorContext = {
      operation: 'blockchain-hash',
      hash,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_HASH_FAILED,
      error,
      errorContext
    }
    
    // Blockchain hash errors are usually non-critical
    console.warn(`Blockchain hash failed:`, hash)
  }
  
  // Handle blockchain signature errors
  function handleBlockchainSignatureError(error, signature, context = {}) {
    const errorContext = {
      operation: 'blockchain-signature',
      signature,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_SIGNATURE_FAILED,
      error,
      errorContext
    }
    
    // Blockchain signature errors are usually non-critical
    console.warn(`Blockchain signature failed:`, signature)
  }
  
  // Handle blockchain encryption errors
  function handleBlockchainEncryptionError(error, encryption, context = {}) {
    const errorContext = {
      operation: 'blockchain-encryption',
      encryption,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_ENCRYPTION_FAILED,
      error,
      errorContext
    }
    
    // Blockchain encryption errors are usually non-critical
    console.warn(`Blockchain encryption failed:`, encryption)
  }
  
  // Handle blockchain decryption errors
  function handleBlockchainDecryptionError(error, decryption, context = {}) {
    const errorContext = {
      operation: 'blockchain-decryption',
      decryption,
      ...context
    }
    
    errorHandling.addError(
      BLOCKCHAIN_ERRORS.BLOCKCHAIN_DECRYPTION_FAILED,
      error,
      errorContext
    }
    
    // Blockchain decryption errors are usually non-critical
    console.warn(`Blockchain decryption failed:`, decryption)
  }
  
  // Execute blockchain operation with error handling
  async function executeBlockchainOperation(operation, operationFunction, context = {}) {
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
  
  // Get blockchain error summary
  function getBlockchainErrorSummary() {
    const summary = errorHandling.getErrorSummary()
    
    // Add blockchain specific analysis
    summary.blockchainErrors = {
      connectionErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_CONNECTION_FAILED] || 0,
      transactionErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_TRANSACTION_FAILED] || 0,
      smartContractErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_SMART_CONTRACT_FAILED] || 0,
      walletErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_WALLET_FAILED] || 0,
      networkErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_NETWORK_FAILED] || 0,
      consensusErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_CONSENSUS_FAILED] || 0,
      miningErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_MINING_FAILED] || 0,
      validationErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_VALIDATION_FAILED] || 0,
      syncErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_SYNC_FAILED] || 0,
      forkErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_FORK_FAILED] || 0,
      reorgErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_REORG_FAILED] || 0,
      merkleErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_MERKLE_FAILED] || 0,
      hashErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_HASH_FAILED] || 0,
      signatureErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_SIGNATURE_FAILED] || 0,
      encryptionErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_ENCRYPTION_FAILED] || 0,
      decryptionErrors: summary.errorTypes[BLOCKCHAIN_ERRORS.BLOCKCHAIN_DECRYPTION_FAILED] || 0
    }
    
    return summary
  }
  
  // Clear blockchain errors
  function clearBlockchainErrors() {
    errorHandling.clearErrors()
  }
  
  return {
    // Inherit all error handling
    ...errorHandling,
    
    // Blockchain specific methods
    handleBlockchainConnectionError,
    handleBlockchainTransactionError,
    handleBlockchainSmartContractError,
    handleBlockchainWalletError,
    handleBlockchainNetworkError,
    handleBlockchainConsensusError,
    handleBlockchainMiningError,
    handleBlockchainValidationError,
    handleBlockchainSyncError,
    handleBlockchainForkError,
    handleBlockchainReorgError,
    handleBlockchainMerkleError,
    handleBlockchainHashError,
    handleBlockchainSignatureError,
    handleBlockchainEncryptionError,
    handleBlockchainDecryptionError,
    
    // Utility methods
    executeBlockchainOperation,
    getBlockchainErrorSummary,
    clearBlockchainErrors,
    
    // Constants
    BLOCKCHAIN_ERRORS
  }
}







