'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignTypedData, useSwitchChain } from 'wagmi';
import { arbitrum } from 'wagmi/chains';
import { usePearAuth, STEP_INFO, AUTH_STEPS } from '@/hooks/usePearAuth';

// Pear Protocol requires Arbitrum network
const REQUIRED_CHAIN_ID = arbitrum.id; // 42161

/**
 * Props for AuthModal component
 */
interface AuthModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when authentication completes successfully */
  onAuthComplete?: () => void;
}

/**
 * Step indicator component showing current progress
 */
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEP_INFO.map((step, index) => (
        <div key={step.step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              currentStep > step.step
                ? 'bg-[var(--accent)] text-black'
                : currentStep === step.step
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--card-border)] text-[var(--muted)]'
            }`}
          >
            {currentStep > step.step ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            ) : (
              step.step
            )}
          </div>
          {index < STEP_INFO.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-1 transition-colors ${
                currentStep > step.step ? 'bg-[var(--accent)]' : 'bg-[var(--card-border)]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Individual step content component
 */
function StepContent({
  step,
  currentStep,
  isLoading,
  error,
  onAction,
}: {
  step: number;
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  onAction: () => void;
}) {
  const stepInfo = STEP_INFO.find((s) => s.step === step);
  const isActive = currentStep === step;
  const isCompleted = currentStep > step;

  if (!stepInfo) return null;

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isActive
          ? 'border-[var(--primary)] bg-[var(--primary)]/5'
          : isCompleted
          ? 'border-[var(--accent)] bg-[var(--accent)]/5'
          : 'border-[var(--card-border)] opacity-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">
            Step {step}: {stepInfo.title}
          </h3>
          <p className="text-xs text-[var(--muted)] mt-1">{stepInfo.description}</p>
        </div>
        {isActive && (
          <button
            onClick={onAction}
            disabled={isLoading}
            className="btn btn-primary py-2 px-4 text-sm"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">&#9696;</span>
                Processing...
              </span>
            ) : step === 1 ? (
              'Sign Message'
            ) : step === 2 ? (
              'Create Wallet'
            ) : step === 3 || step === 4 ? (
              'Sign & Approve'
            ) : (
              'Continue'
            )}
          </button>
        )}
        {isCompleted && (
          <span className="text-[var(--accent)] text-sm font-medium flex items-center gap-1">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
            Complete
          </span>
        )}
      </div>
      {isActive && error && (
        <div className="mt-3 p-2 bg-[var(--danger)]/10 border border-[var(--danger)] rounded text-xs text-[var(--danger)]">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Authentication modal component for Pear Protocol
 *
 * Task 3.3: Create src/components/pear/AuthModal.tsx
 * - Display guided modal with 4 sequential steps
 * - Step indicators showing current progress
 * - Reuse ConnectWallet component patterns for styling
 *
 * Task 3.4-3.7: Implement all 4 authentication steps
 */
export function AuthModal({ isOpen, onClose, onAuthComplete }: AuthModalProps) {
  const { address, isConnected, chainId } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChainAsync } = useSwitchChain();

  const isWrongNetwork = chainId !== REQUIRED_CHAIN_ID;

  const {
    isAuthenticating,
    currentStep,
    error,
    eip712Message,
    stepLoading,
    step3TypedData,
    step4TypedData,
    getEIP712Message,
    completeStep1,
    completeStep2,
    getStep3TypedData,
    completeStep3,
    getStep4TypedData,
    completeStep4,
    cancelAuth,
    clearError,
    setOnAuthComplete,
    startAuth,
  } = usePearAuth();

  const [localError, setLocalError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Set the onAuthComplete callback when modal opens
  useEffect(() => {
    if (isOpen && onAuthComplete) {
      setOnAuthComplete(onAuthComplete);
    }
  }, [isOpen, onAuthComplete, setOnAuthComplete]);

  // Initialize auth flow when modal opens
  useEffect(() => {
    if (isOpen && !isAuthenticating && !initialized) {
      startAuth();
      setInitialized(true);
    }
    if (!isOpen) {
      setInitialized(false);
    }
  }, [isOpen, isAuthenticating, initialized, startAuth]);

  // Handle network switch to Arbitrum
  const handleSwitchNetwork = useCallback(async () => {
    setLocalError(null);
    try {
      await switchChainAsync({ chainId: REQUIRED_CHAIN_ID });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch network';
      setLocalError(errorMessage);
    }
  }, [switchChainAsync]);

  // Handle Step 1: Authenticate
  const handleStep1 = useCallback(async () => {
    if (!isConnected || !address) {
      setLocalError('Please connect your wallet first');
      return;
    }

    // Check if we need to switch networks first
    if (isWrongNetwork) {
      setLocalError('Please switch to Arbitrum network first');
      return;
    }

    setLocalError(null);
    clearError();

    try {
      // Get EIP-712 message if we don't have it
      let message = eip712Message;
      if (!message) {
        message = await getEIP712Message(address);
      }

      // Sign the message using wagmi's useSignTypedData
      const signature = await signTypedDataAsync({
        domain: message.domain as {
          name: string;
          version: string;
          chainId?: number;
          verifyingContract?: `0x${string}`;
        },
        types: message.types,
        primaryType: message.primaryType || 'Auth',
        message: message.message,
      });

      // Complete step 1 with the signature and original message (for timestamp verification)
      await completeStep1(signature, address, message);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
      setLocalError(errorMessage);
    }
  }, [
    isConnected,
    address,
    isWrongNetwork,
    eip712Message,
    getEIP712Message,
    signTypedDataAsync,
    completeStep1,
    clearError,
  ]);

  // Handle Step 2: Create Agent Wallet
  const handleStep2 = useCallback(async () => {
    setLocalError(null);
    clearError();

    try {
      await completeStep2();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent wallet';
      setLocalError(errorMessage);
    }
  }, [completeStep2, clearError]);

  // Handle Step 3: Approve Agent Wallet on Hyperliquid
  const handleStep3 = useCallback(async () => {
    setLocalError(null);
    clearError();

    try {
      // ALWAYS generate fresh typed data with new nonce to avoid duplicate nonce errors
      const typedData = getStep3TypedData();

      if (!typedData) {
        throw new Error('Failed to get approval data. Please try again.');
      }

      // Sign the Hyperliquid approval message
      const signature = await signTypedDataAsync({
        domain: typedData.domain as {
          name: string;
          version: string;
          chainId: number;
          verifyingContract: `0x${string}`;
        },
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });

      // Complete step 3 with the signature
      await completeStep3(signature);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve agent wallet';
      setLocalError(errorMessage);
    }
  }, [completeStep3, clearError, step3TypedData, getStep3TypedData, signTypedDataAsync]);

  // Handle Step 4: Approve Builder Fee on Hyperliquid
  const handleStep4 = useCallback(async () => {
    setLocalError(null);
    clearError();

    try {
      // ALWAYS generate fresh typed data with new nonce to avoid duplicate nonce errors
      const typedData = getStep4TypedData();

      if (!typedData) {
        throw new Error('Failed to get builder fee approval data. Please try again.');
      }

      // Sign the Hyperliquid builder fee approval message
      const signature = await signTypedDataAsync({
        domain: typedData.domain as {
          name: string;
          version: string;
          chainId: number;
          verifyingContract: `0x${string}`;
        },
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });

      // Complete step 4 with the signature
      await completeStep4(signature);
      // Modal will auto-close via onAuthComplete callback
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve builder fee';
      setLocalError(errorMessage);
    }
  }, [completeStep4, clearError, step4TypedData, getStep4TypedData, signTypedDataAsync]);

  // Get the appropriate action handler for the current step
  const getStepAction = useCallback(
    (step: number) => {
      switch (step) {
        case AUTH_STEPS.AUTHENTICATE:
          return handleStep1;
        case AUTH_STEPS.CREATE_AGENT_WALLET:
          return handleStep2;
        case AUTH_STEPS.APPROVE_AGENT_WALLET:
          return handleStep3;
        case AUTH_STEPS.APPROVE_BUILDER_FEE:
          return handleStep4;
        default:
          return () => {};
      }
    },
    [handleStep1, handleStep2, handleStep3, handleStep4]
  );

  // Handle modal close
  const handleClose = useCallback(() => {
    cancelAuth();
    setLocalError(null);
    onClose();
  }, [cancelAuth, onClose]);

  if (!isOpen) return null;

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="max-w-lg w-full p-6 relative bg-[#0a0a0a] border border-[var(--card-border)] rounded-lg">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close modal"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold">Setup Trading Account</h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Complete these steps to enable trading via Pear Protocol
          </p>
        </div>

        {/* Network Warning */}
        {isWrongNetwork && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-500">Wrong Network</p>
                <p className="text-xs text-yellow-500/80">
                  Pear Protocol requires Arbitrum network
                </p>
              </div>
              <button
                onClick={handleSwitchNetwork}
                className="btn btn-primary py-1.5 px-3 text-sm"
              >
                Switch to Arbitrum
              </button>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Step Contents */}
        <div className="space-y-3">
          {STEP_INFO.map((step) => (
            <StepContent
              key={step.step}
              step={step.step}
              currentStep={currentStep}
              isLoading={stepLoading && currentStep === step.step}
              error={currentStep === step.step ? displayError : null}
              onAction={getStepAction(step.step)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={handleClose}
            className="btn btn-secondary py-2 px-4 text-sm"
          >
            Cancel
          </button>
          <div className="text-xs text-[var(--muted)]">
            Step {currentStep} of 4
          </div>
        </div>
      </div>
    </div>
  );
}
