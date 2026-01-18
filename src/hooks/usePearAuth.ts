'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  authenticate,
  login,
  getAgentWallet,
  createAgentWallet,
  getApproveAgentTypedData,
  getApproveBuilderFeeTypedData,
  submitApproveAgent,
  submitApproveBuilderFee,
  isAuthenticated as checkIsAuthenticated,
  isRefreshTokenExpired,
  getStoredTokens,
  getAuthProgress,
  updateAuthProgress,
  clearAuthProgress,
  type HyperliquidTypedData,
} from '@/lib/pear-client';

/**
 * Authentication step constants
 */
export const AUTH_STEPS = {
  NOT_STARTED: 0,
  AUTHENTICATE: 1,
  CREATE_AGENT_WALLET: 2,
  APPROVE_AGENT_WALLET: 3,
  APPROVE_BUILDER_FEE: 4,
} as const;

export type AuthStep = (typeof AUTH_STEPS)[keyof typeof AUTH_STEPS];

/**
 * Authentication step info for UI display
 */
export const STEP_INFO = [
  { step: 1, title: 'Authenticate', description: 'Sign message to verify your wallet' },
  { step: 2, title: 'Create Agent Wallet', description: 'Create a secure trading wallet' },
  { step: 3, title: 'Approve Agent Wallet', description: 'Approve wallet on Hyperliquid' },
  { step: 4, title: 'Approve Builder Fee', description: 'Approve builder fee for trades' },
];

/**
 * Get the step to resume from based on stored progress
 * If tokens expired or no progress, returns AUTHENTICATE
 */
export function getResumeStep(): AuthStep {
  const progress = getAuthProgress();
  const tokens = getStoredTokens();

  // If no tokens or refresh token expired, must start over
  if (!tokens || isRefreshTokenExpired()) return AUTH_STEPS.AUTHENTICATE;
  if (!progress) return AUTH_STEPS.AUTHENTICATE;

  // Return the first incomplete step
  if (!progress.step1Complete) return AUTH_STEPS.AUTHENTICATE;
  if (!progress.step2Complete) return AUTH_STEPS.CREATE_AGENT_WALLET;
  if (!progress.step3Complete) return AUTH_STEPS.APPROVE_AGENT_WALLET;
  if (!progress.step4Complete) return AUTH_STEPS.APPROVE_BUILDER_FEE;

  // All steps complete
  return AUTH_STEPS.APPROVE_BUILDER_FEE;
}

/**
 * EIP-712 typed data structure
 */
export interface EIP712TypedData {
  domain: {
    name: string;
    version: string;
    chainId?: number;
    verifyingContract?: string;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType?: string;
  message: Record<string, unknown>;
}

/**
 * State for the authentication flow
 */
interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  currentStep: AuthStep;
  error: string | null;
  eip712Message: EIP712TypedData | null;
  agentWalletAddress: string | null;
  stepLoading: boolean;
  // Typed data for Hyperliquid signing (steps 3 & 4)
  step3TypedData: HyperliquidTypedData | null;
  step4TypedData: HyperliquidTypedData | null;
}

/**
 * Custom hook for managing Pear Protocol authentication flow.
 *
 * Task 3.2: Create src/hooks/usePearAuth.ts hook
 * - Follow same pattern as useChat hook (refs to avoid stale closures)
 * - Manage authentication state: isAuthenticated, isAuthenticating, currentStep
 * - Expose functions: startAuth, completeStep, checkAuthStatus
 * - Check agent wallet status and validity (180 days, 30 day rotation)
 */
export function usePearAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isAuthenticating: false,
    currentStep: AUTH_STEPS.NOT_STARTED,
    error: null,
    eip712Message: null,
    agentWalletAddress: null,
    stepLoading: false,
    step3TypedData: null,
    step4TypedData: null,
  });

  // Refs to avoid stale closures (following useChat pattern)
  const stateRef = useRef<AuthState>(state);
  const onAuthCompleteRef = useRef<(() => void) | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Check current authentication status from localStorage
   */
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    const authenticated = checkIsAuthenticated();
    setState((prev) => ({ ...prev, isAuthenticated: authenticated }));
    return authenticated;
  }, []);

  /**
   * Check agent wallet validity (180 days validity, 30 day rotation)
   */
  const checkAgentWalletValidity = useCallback(async (): Promise<boolean> => {
    try {
      const walletStatus = await getAgentWallet();

      if (!walletStatus.exists) {
        return false;
      }

      // Check if wallet is still valid
      if (walletStatus.validUntil) {
        const validUntil = new Date(walletStatus.validUntil);
        const now = new Date();

        // If valid until date has passed, wallet is invalid
        if (validUntil <= now) {
          return false;
        }

        // Check if we need rotation (30 days before expiry)
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const rotationThreshold = new Date(validUntil.getTime() - thirtyDaysMs);

        if (now >= rotationThreshold) {
          // Wallet needs rotation but is still valid
          console.log('Agent wallet approaching expiry, consider rotation');
        }
      }

      return walletStatus.isValid ?? true;
    } catch (error) {
      console.error('Failed to check agent wallet validity:', error);
      return false;
    }
  }, []);

  /**
   * Start the authentication flow (resumes from last incomplete step if applicable)
   */
  const startAuth = useCallback(() => {
    const resumeStep = getResumeStep();
    const progress = getAuthProgress();

    setState((prev) => ({
      ...prev,
      isAuthenticating: true,
      currentStep: resumeStep,
      error: null,
      eip712Message: null,
      // Restore agent wallet address if resuming from step 3 or 4
      agentWalletAddress: progress?.agentWalletAddress || prev.agentWalletAddress,
    }));
  }, []);

  /**
   * Cancel the authentication flow
   */
  const cancelAuth = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isAuthenticating: false,
      currentStep: AUTH_STEPS.NOT_STARTED,
      error: null,
      eip712Message: null,
      stepLoading: false,
    }));
  }, []);

  /**
   * Fetch EIP-712 message for Step 1
   * @param address - The wallet address to authenticate
   */
  const getEIP712Message = useCallback(async (address: string): Promise<EIP712TypedData> => {
    setState((prev) => ({ ...prev, stepLoading: true, error: null }));

    try {
      const message = await authenticate(address);
      setState((prev) => ({
        ...prev,
        eip712Message: message as EIP712TypedData,
        stepLoading: false,
      }));
      return message as EIP712TypedData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get auth message';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        stepLoading: false,
      }));
      throw error;
    }
  }, []);

  /**
   * Complete Step 1: Authenticate with signed message
   * @param signature - The signed EIP-712 message
   * @param address - The wallet address
   * @param message - The original EIP-712 message (needed for timestamp verification)
   */
  const completeStep1 = useCallback(async (
    signature: string,
    address: string,
    message: EIP712TypedData
  ): Promise<void> => {
    setState((prev) => ({ ...prev, stepLoading: true, error: null }));

    try {
      await login(signature, address, message);

      // Persist step 1 completion
      updateAuthProgress({ step1Complete: true });

      setState((prev) => ({
        ...prev,
        currentStep: AUTH_STEPS.CREATE_AGENT_WALLET,
        stepLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        stepLoading: false,
      }));
      throw error;
    }
  }, []);

  /**
   * Complete Step 2: Create Agent Wallet (if needed)
   * Returns the typed data for step 3 signing
   */
  const completeStep2 = useCallback(async (): Promise<HyperliquidTypedData> => {
    setState((prev) => ({ ...prev, stepLoading: true, error: null }));

    try {
      // First check if agent wallet already exists
      const walletStatus = await getAgentWallet();

      let agentAddress: string;

      if (!walletStatus.agentWalletAddress) {
        // Create new agent wallet
        const newWallet = await createAgentWallet();
        agentAddress = newWallet.agentWalletAddress;
      } else {
        agentAddress = walletStatus.agentWalletAddress;
      }

      if (!agentAddress) {
        throw new Error('Failed to get agent wallet address');
      }

      // Generate typed data for step 3 (approve agent wallet)
      const step3TypedData = getApproveAgentTypedData(agentAddress);

      // Persist step 2 completion with agent wallet address
      updateAuthProgress({ step2Complete: true, agentWalletAddress: agentAddress });

      setState((prev) => ({
        ...prev,
        currentStep: AUTH_STEPS.APPROVE_AGENT_WALLET,
        agentWalletAddress: agentAddress,
        step3TypedData: step3TypedData,
        stepLoading: false,
      }));

      return step3TypedData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create agent wallet';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        stepLoading: false,
      }));
      throw error;
    }
  }, []);

  /**
   * Get typed data for Step 3 - ALWAYS generates fresh nonce
   * This is important because Hyperliquid rejects duplicate nonces
   */
  const getStep3TypedData = useCallback((): HyperliquidTypedData | null => {
    const agentAddress = stateRef.current.agentWalletAddress;
    if (!agentAddress) {
      // Try to get from stored progress
      const progress = getAuthProgress();
      if (progress?.agentWalletAddress) {
        // Always generate fresh typed data with new nonce
        const typedData = getApproveAgentTypedData(progress.agentWalletAddress);
        setState((prev) => ({ ...prev, step3TypedData: typedData, agentWalletAddress: progress.agentWalletAddress ?? null }));
        return typedData;
      }
      return null;
    }
    // Always generate fresh typed data with new nonce
    const typedData = getApproveAgentTypedData(agentAddress);
    setState((prev) => ({ ...prev, step3TypedData: typedData }));
    return typedData;
  }, []);

  /**
   * Complete Step 3: Approve Agent Wallet on Hyperliquid
   * @param signature - The EIP-712 signature from the user's wallet
   */
  const completeStep3 = useCallback(async (signature: string): Promise<HyperliquidTypedData> => {
    setState((prev) => ({ ...prev, stepLoading: true, error: null }));

    try {
      const agentAddress = stateRef.current.agentWalletAddress;
      const typedData = stateRef.current.step3TypedData;

      if (!agentAddress) {
        throw new Error('Agent wallet address not found');
      }
      if (!typedData) {
        throw new Error('Step 3 typed data not found');
      }

      // Get nonce from typed data
      const nonce = typedData.message.nonce as number;

      // Submit to Hyperliquid
      const result = await submitApproveAgent(agentAddress, signature, nonce);

      if (!result.success) {
        throw new Error(result.error || 'Failed to approve agent wallet on Hyperliquid');
      }

      // Generate typed data for step 4 (approve builder fee)
      const step4TypedData = getApproveBuilderFeeTypedData();

      // Persist step 3 completion
      updateAuthProgress({ step3Complete: true });

      setState((prev) => ({
        ...prev,
        currentStep: AUTH_STEPS.APPROVE_BUILDER_FEE,
        step4TypedData: step4TypedData,
        stepLoading: false,
      }));

      return step4TypedData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve agent wallet';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        stepLoading: false,
      }));
      throw error;
    }
  }, []);

  /**
   * Get typed data for Step 4 - ALWAYS generates fresh nonce
   * This is important because Hyperliquid rejects duplicate nonces
   */
  const getStep4TypedData = useCallback((): HyperliquidTypedData => {
    // Always generate fresh typed data with new nonce
    const typedData = getApproveBuilderFeeTypedData();
    setState((prev) => ({ ...prev, step4TypedData: typedData }));
    return typedData;
  }, []);

  /**
   * Complete Step 4: Approve Builder Fee
   * @param signature - The EIP-712 signature from the user's wallet
   */
  const completeStep4 = useCallback(async (signature: string): Promise<void> => {
    setState((prev) => ({ ...prev, stepLoading: true, error: null }));

    try {
      const typedData = stateRef.current.step4TypedData;

      if (!typedData) {
        throw new Error('Step 4 typed data not found');
      }

      // Get nonce from typed data
      const nonce = typedData.message.nonce as number;

      // Submit to Hyperliquid
      const result = await submitApproveBuilderFee(signature, nonce);

      if (!result.success) {
        throw new Error(result.error || 'Failed to approve builder fee on Hyperliquid');
      }

      // Persist step 4 completion and clear progress (all steps done)
      updateAuthProgress({ step4Complete: true });
      clearAuthProgress();

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        isAuthenticating: false,
        stepLoading: false,
      }));

      // Call the onAuthComplete callback if set
      if (onAuthCompleteRef.current) {
        onAuthCompleteRef.current();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve builder fee';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        stepLoading: false,
      }));
      throw error;
    }
  }, []);

  /**
   * Complete authentication (for when full flow is done externally)
   */
  const completeAuth = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      isAuthenticating: false,
    }));

    // Call the onAuthComplete callback if set
    if (onAuthCompleteRef.current) {
      onAuthCompleteRef.current();
    }
  }, []);

  /**
   * Set callback for when authentication completes
   */
  const setOnAuthComplete = useCallback((callback: (() => void) | null) => {
    onAuthCompleteRef.current = callback;
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Reset all auth state
   */
  const resetAuth = useCallback(() => {
    // Clear persisted progress
    clearAuthProgress();

    setState({
      isAuthenticated: false,
      isAuthenticating: false,
      currentStep: AUTH_STEPS.NOT_STARTED,
      error: null,
      eip712Message: null,
      agentWalletAddress: null,
      stepLoading: false,
      step3TypedData: null,
      step4TypedData: null,
    });
    onAuthCompleteRef.current = null;
  }, []);

  return {
    // State
    isAuthenticated: state.isAuthenticated,
    isAuthenticating: state.isAuthenticating,
    currentStep: state.currentStep,
    error: state.error,
    eip712Message: state.eip712Message,
    agentWalletAddress: state.agentWalletAddress,
    stepLoading: state.stepLoading,
    step3TypedData: state.step3TypedData,
    step4TypedData: state.step4TypedData,

    // Actions
    checkAuthStatus,
    checkAgentWalletValidity,
    startAuth,
    cancelAuth,
    getEIP712Message,
    completeStep1,
    completeStep2,
    getStep3TypedData,
    completeStep3,
    getStep4TypedData,
    completeStep4,
    completeAuth,
    setOnAuthComplete,
    clearError,
    resetAuth,
  };
}
