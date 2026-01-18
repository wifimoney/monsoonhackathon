/**
 * Pear Protocol API Client
 * Task 1.2: Centralized API client for all Pear Protocol operations
 *
 * Base URL: https://hl-v2.pearprotocol.io
 * Handles JWT token management and automatic refresh on 401 responses
 */

// ============================================================================
// Configuration
// ============================================================================

const PEAR_API_BASE_URL = 'https://hl-v2.pearprotocol.io';
const BUILDER_ADDRESS = '0xA47D4d99191db54A4829cdf3de2417E527c3b042';
const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TOKEN_STORAGE_KEY = 'pear_tokens';

// Hyperliquid API configuration
const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz/exchange';
const HYPERLIQUID_CHAIN = 'Mainnet';
const ARBITRUM_CHAIN_ID = '0xa4b1'; // Arbitrum One chain ID in hex
const MAX_BUILDER_FEE_RATE = '0.1%'; // 10 basis points (max for perps) - Pear charges 0.06%
const PEAR_AGENT_NAME = 'Pear Protocol';

// ============================================================================
// Types
// ============================================================================

/**
 * Stored token data with expiry timestamps
 */
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
}

/**
 * EIP-712 message for authentication
 */
export interface EIP712Message {
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
 * Agent wallet status from Pear API
 * Note: API returns agentWalletAddress, not address
 */
export interface AgentWalletStatus {
  exists: boolean;
  address?: string;
  agentWalletAddress?: string; // Actual field from API
  validUntil?: string;
  lastRotation?: string;
  isValid?: boolean;
}

/**
 * Position creation request
 */
export interface CreatePositionRequest {
  longAssets: string[];
  shortAssets: string[];
  weights: number[];
}

/**
 * Position asset data from API (longAssets/shortAssets arrays)
 */
export interface PositionAsset {
  coin: string;
  entryPrice: number;
  actualSize: number;
  leverage: number;
  marginUsed: number;
  positionValue: number;
  unrealizedPnl: number;
}

/**
 * Position data from API
 * Note: API only returns OPEN positions, so there's no status field
 */
export interface PearPosition {
  positionId: string;
  address?: string;
  unrealizedPnl: number;           // lowercase 'l' - actual API field
  unrealizedPnlPercentage: number; // actual API field
  positionValue: number;           // current USD value
  entryPositionValue: number;
  marginUsed: number;
  longAssets: PositionAsset[];     // array of asset objects
  shortAssets: PositionAsset[];    // array of asset objects
  createdAt: string;
  updatedAt: string;
  // Legacy fields for backwards compatibility (may be undefined)
  status?: 'OPEN' | 'CLOSED' | 'PENDING';
  weights?: number[];
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;          // uppercase 'L' - legacy
  unrealizedPnLPercent?: number;   // legacy
  size?: number;                   // legacy - use positionValue instead
  pair?: string;                   // legacy
  symbol?: string;                 // legacy
  leverage?: number;               // legacy
}

/**
 * Portfolio metrics (normalized for UI display)
 */
export interface PortfolioMetrics {
  totalPositionsValue: number;
  availableBalance: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  marginUsage: number;
  // Legacy field for backwards compatibility
  totalAccountValue?: number;
}

/**
 * Actual API response from GET /portfolio
 */
interface PortfolioApiResponse {
  intervals: {
    oneDay: PortfolioBucket[];
    oneWeek: PortfolioBucket[];
    oneMonth: PortfolioBucket[];
    oneYear: PortfolioBucket[];
    all: PortfolioBucket[];
  };
  overall: {
    totalWinningTradesCount: number;
    totalLosingTradesCount: number;
    totalWinningUsd: number;
    totalLosingUsd: number;
    currentOpenInterest: number;
    currentTotalVolume: number;
    unrealizedPnl: number;
    totalTrades: number;
  };
}

interface PortfolioBucket {
  periodStart: string;
  periodEnd: string;
  volume: number;
  openInterest: number;
  winningTradesCount: number;
  winningTradesUsd: number;
  losingTradesCount: number;
  losingTradesUsd: number;
}

/**
 * Trade asset data from API (closedLongAssets/closedShortAssets arrays)
 */
export interface TradeAsset {
  coin: string;
  entryPrice: number;
  exitPrice: number;
  actualSize: number;
  leverage: number;
  realizedPnl: number;
}

/**
 * Trade history entry
 * Updated to match actual Pear API TradeHistoryDataDto
 */
export interface TradeHistoryEntry {
  tradeHistoryId: string;          // actual API field (not tradeId)
  positionId: string;
  realizedPnl: number;             // lowercase 'l'
  realizedPnlPercentage: number;
  totalValue: number;
  totalEntryValue: number;
  closedLongAssets: TradeAsset[];  // actual API field
  closedShortAssets: TradeAsset[]; // actual API field
  positionLongAssets?: string[];
  positionShortAssets?: string[];
  createdAt: string;               // actual API field (not timestamp)
  // Legacy fields for backwards compatibility
  tradeId?: string;
  id?: string;
  pair?: string;
  symbol?: string;
  asset?: string;
  side?: 'LONG' | 'SHORT' | 'long' | 'short' | string;
  size?: number;
  notional?: number;
  price?: number;
  entryPrice?: number;
  timestamp?: string;
  time?: string;
  realizedPnL?: number;            // uppercase 'L' - legacy
  pnl?: number;
  [key: string]: unknown; // Allow additional fields
}

// ============================================================================
// Hyperliquid Types for Agent/Builder Approval
// ============================================================================

/**
 * Hyperliquid ApproveAgent action
 */
export interface HyperliquidApproveAgentAction {
  type: 'approveAgent';
  hyperliquidChain: 'Mainnet' | 'Testnet';
  signatureChainId: string;
  agentAddress: string;
  agentName: string; // Empty string for no name
  nonce: number;
}

/**
 * Hyperliquid ApproveBuilderFee action
 */
export interface HyperliquidApproveBuilderFeeAction {
  type: 'approveBuilderFee';
  hyperliquidChain: 'Mainnet' | 'Testnet';
  signatureChainId: string;
  maxFeeRate: string;
  builder: string;
  nonce: number;
}

/**
 * EIP-712 typed data for Hyperliquid signing
 */
export interface HyperliquidTypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    [key: string]: Array<{ name: string; type: string }>;
  };
  primaryType: string;
  message: Record<string, unknown>;
}

/**
 * Signature components for Hyperliquid
 */
export interface HyperliquidSignature {
  r: string;
  s: string;
  v: number;
}

// ============================================================================
// Task 1.3: Token Management Utilities
// ============================================================================

/**
 * Store JWT tokens in localStorage with expiry timestamps
 */
export function storeTokens(accessToken: string, refreshToken: string): void {
  const now = Date.now();
  const tokenData: StoredTokens = {
    accessToken,
    refreshToken,
    accessTokenExpiry: now + ACCESS_TOKEN_EXPIRY_MS,
    refreshTokenExpiry: now + REFRESH_TOKEN_EXPIRY_MS,
  };
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
}

/**
 * Get stored tokens from localStorage
 */
export function getStoredTokens(): StoredTokens | null {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as StoredTokens;
  } catch {
    return null;
  }
}

/**
 * Clear stored tokens
 */
export function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// ============================================================================
// Auth Progress Tracking
// ============================================================================

const AUTH_PROGRESS_KEY = 'pear_auth_progress';

/**
 * Auth progress tracking interface
 */
export interface AuthProgress {
  step1Complete: boolean;  // Login completed
  step2Complete: boolean;  // Agent wallet created
  step3Complete: boolean;  // Agent wallet approved on Hyperliquid
  step4Complete: boolean;  // Builder fee approved
  agentWalletAddress?: string;
}

/**
 * Store auth progress in localStorage
 */
export function storeAuthProgress(progress: AuthProgress): void {
  localStorage.setItem(AUTH_PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * Get auth progress from localStorage
 */
export function getAuthProgress(): AuthProgress | null {
  const stored = localStorage.getItem(AUTH_PROGRESS_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthProgress;
  } catch {
    return null;
  }
}

/**
 * Clear auth progress from localStorage
 */
export function clearAuthProgress(): void {
  localStorage.removeItem(AUTH_PROGRESS_KEY);
}

/**
 * Update auth progress with partial updates
 */
export function updateAuthProgress(updates: Partial<AuthProgress>): void {
  const current = getAuthProgress() || {
    step1Complete: false,
    step2Complete: false,
    step3Complete: false,
    step4Complete: false,
  };
  storeAuthProgress({ ...current, ...updates });
}

/**
 * Check if access token is expired
 */
export function isAccessTokenExpired(): boolean {
  const tokens = getStoredTokens();
  if (!tokens) return true;
  return Date.now() >= tokens.accessTokenExpiry;
}

/**
 * Check if refresh token is expired
 */
export function isRefreshTokenExpired(): boolean {
  const tokens = getStoredTokens();
  if (!tokens) return true;
  return Date.now() >= tokens.refreshTokenExpiry;
}

/**
 * Check if user is authenticated (has valid refresh token)
 */
export function isAuthenticated(): boolean {
  return !isRefreshTokenExpired();
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Make an authenticated API request with automatic token refresh on 401
 */
async function authenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const tokens = getStoredTokens();

  if (!tokens) {
    throw new Error('Not authenticated');
  }

  // Check if access token is expired and refresh proactively
  if (isAccessTokenExpired() && !isRetry) {
    await refreshToken();
  }

  const currentTokens = getStoredTokens();
  if (!currentTokens) {
    throw new Error('Token refresh failed');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${currentTokens.accessToken}`,
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${PEAR_API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 by refreshing token and retrying once
  if (response.status === 401 && !isRetry) {
    await refreshToken();
    return authenticatedRequest<T>(endpoint, options, true);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Make an unauthenticated API request
 */
async function unauthenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${PEAR_API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Task 1.4: Authentication Functions
// ============================================================================

/**
 * Get EIP-712 message for authentication signing
 * GET /auth/eip712-message
 * Requires clientId (APITRADER for individual traders) and wallet address
 */
export async function authenticate(address: string): Promise<EIP712Message> {
  const params = new URLSearchParams({
    clientId: 'APITRADER',
    address: address,
  });
  return unauthenticatedRequest<EIP712Message>(`/auth/eip712-message?${params.toString()}`, {
    method: 'GET',
  });
}

/**
 * Login with signed EIP-712 message
 * POST /auth/login
 * Requires method, address, clientId, and signature details including the original message
 */
export async function login(
  signature: string,
  address: string,
  eip712Message: EIP712Message
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await unauthenticatedRequest<{
    accessToken: string;
    refreshToken: string;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      method: 'eip712',
      address: address,
      clientId: 'APITRADER',
      details: {
        signature: signature,
        ...eip712Message.message, // Include the original message content (timestamp, action, etc.)
      },
    }),
  });

  // Store the tokens
  storeTokens(response.accessToken, response.refreshToken);

  return response;
}

/**
 * Refresh the access token using the refresh token
 * POST /auth/refresh
 */
export async function refreshToken(): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const tokens = getStoredTokens();

  if (!tokens || isRefreshTokenExpired()) {
    clearTokens();
    throw new Error('Refresh token expired, please re-authenticate');
  }

  const response = await fetch(`${PEAR_API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  storeTokens(data.accessToken, data.refreshToken);

  return data;
}

// ============================================================================
// Task 1.5: Agent Wallet Functions
// ============================================================================

/**
 * Get agent wallet status
 * GET /agentWallet
 */
export async function getAgentWallet(): Promise<AgentWalletStatus> {
  return authenticatedRequest<AgentWalletStatus>('/agentWallet', {
    method: 'GET',
  });
}

/**
 * Create agent wallet
 * POST /agentWallet
 * Note: API returns agentWalletAddress field
 */
export async function createAgentWallet(): Promise<{
  agentWalletAddress: string;
  validUntil?: string;
  message?: string;
}> {
  return authenticatedRequest<{ agentWalletAddress: string; validUntil?: string; message?: string }>(
    '/agentWallet',
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
}

// ============================================================================
// Hyperliquid Agent Wallet & Builder Fee Approval
// ============================================================================

/**
 * EIP-712 domain for Hyperliquid signing
 */
const HYPERLIQUID_EIP712_DOMAIN = {
  name: 'HyperliquidSignTransaction',
  version: '1',
  chainId: 42161, // Arbitrum One
  verifyingContract: '0x0000000000000000000000000000000000000000' as const,
};

/**
 * EIP-712 types for ApproveAgent action
 */
const APPROVE_AGENT_TYPES = {
  'HyperliquidTransaction:ApproveAgent': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'agentAddress', type: 'address' },
    { name: 'agentName', type: 'string' },
    { name: 'nonce', type: 'uint64' },
  ],
};

/**
 * EIP-712 types for ApproveBuilderFee action
 */
const APPROVE_BUILDER_FEE_TYPES = {
  'HyperliquidTransaction:ApproveBuilderFee': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'maxFeeRate', type: 'string' },
    { name: 'builder', type: 'address' },
    { name: 'nonce', type: 'uint64' },
  ],
};

/**
 * Generate EIP-712 typed data for ApproveAgent action
 * This needs to be signed by the user's wallet
 * Note: Using empty string for agentName to ensure EIP-712 signature encoding matches
 */
export function getApproveAgentTypedData(agentAddress: string): HyperliquidTypedData {
  const nonce = Date.now();

  return {
    domain: HYPERLIQUID_EIP712_DOMAIN,
    types: APPROVE_AGENT_TYPES,
    primaryType: 'HyperliquidTransaction:ApproveAgent',
    message: {
      hyperliquidChain: HYPERLIQUID_CHAIN,
      agentAddress: agentAddress,
      agentName: PEAR_AGENT_NAME, // Must be "Pear Protocol" for Pear's system
      nonce: nonce,
    },
  };
}

/**
 * Generate EIP-712 typed data for ApproveBuilderFee action
 * This needs to be signed by the user's wallet
 */
export function getApproveBuilderFeeTypedData(): HyperliquidTypedData {
  const nonce = Date.now();

  return {
    domain: HYPERLIQUID_EIP712_DOMAIN,
    types: APPROVE_BUILDER_FEE_TYPES,
    primaryType: 'HyperliquidTransaction:ApproveBuilderFee',
    message: {
      hyperliquidChain: HYPERLIQUID_CHAIN,
      maxFeeRate: MAX_BUILDER_FEE_RATE,
      builder: BUILDER_ADDRESS,
      nonce: nonce,
    },
  };
}

/**
 * Parse signature into r, s, v components
 */
function parseSignature(signature: string): HyperliquidSignature {
  // Remove 0x prefix if present
  const sig = signature.startsWith('0x') ? signature.slice(2) : signature;

  return {
    r: '0x' + sig.slice(0, 64),
    s: '0x' + sig.slice(64, 128),
    v: parseInt(sig.slice(128, 130), 16),
  };
}

/**
 * Submit signed ApproveAgent action to Hyperliquid
 * @param agentAddress - The agent wallet address to approve
 * @param signature - The EIP-712 signature from the user's wallet
 * @param nonce - The nonce used in the typed data (must match)
 */
export async function submitApproveAgent(
  agentAddress: string,
  signature: string,
  nonce: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsedSig = parseSignature(signature);

    const requestBody = {
      action: {
        type: 'approveAgent',
        hyperliquidChain: HYPERLIQUID_CHAIN,
        signatureChainId: ARBITRUM_CHAIN_ID,
        agentAddress: agentAddress,
        agentName: PEAR_AGENT_NAME, // Must match signed message
        nonce: nonce,
      },
      nonce: nonce,
      signature: parsedSig,
    };

    console.log('Submitting ApproveAgent to Hyperliquid:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(HYPERLIQUID_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('Hyperliquid ApproveAgent response:', response.status, responseText);

    if (!response.ok) {
      return {
        success: false,
        error: `Hyperliquid API error: ${response.status} - ${responseText}`,
      };
    }

    const data = JSON.parse(responseText);
    if (data.status === 'ok') {
      return { success: true };
    }

    // Check for duplicate nonce error - this means the agent was already approved
    const errorMsg = data.response?.error || data.response || '';
    if (typeof errorMsg === 'string' && errorMsg.includes('duplicate nonce')) {
      console.log('Agent wallet already approved (duplicate nonce detected)');
      return { success: true }; // Treat as success since it's already approved
    }

    return {
      success: false,
      error: typeof errorMsg === 'string' ? errorMsg : 'Unknown error from Hyperliquid',
    };
  } catch (error) {
    console.error('submitApproveAgent error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve agent wallet',
    };
  }
}

/**
 * Submit signed ApproveBuilderFee action to Hyperliquid
 * @param signature - The EIP-712 signature from the user's wallet
 * @param nonce - The nonce used in the typed data (must match)
 */
export async function submitApproveBuilderFee(
  signature: string,
  nonce: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsedSig = parseSignature(signature);

    const requestBody = {
      action: {
        type: 'approveBuilderFee',
        hyperliquidChain: HYPERLIQUID_CHAIN,
        signatureChainId: ARBITRUM_CHAIN_ID,
        maxFeeRate: MAX_BUILDER_FEE_RATE,
        builder: BUILDER_ADDRESS,
        nonce: nonce,
      },
      nonce: nonce,
      signature: parsedSig,
    };

    console.log('Submitting ApproveBuilderFee to Hyperliquid:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(HYPERLIQUID_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('Hyperliquid ApproveBuilderFee response:', response.status, responseText);

    if (!response.ok) {
      return {
        success: false,
        error: `Hyperliquid API error: ${response.status} - ${responseText}`,
      };
    }

    const data = JSON.parse(responseText);
    if (data.status === 'ok') {
      return { success: true };
    }

    // Check for duplicate nonce error - this means the builder fee was already approved
    const errorMsg = data.response?.error || data.response || '';
    if (typeof errorMsg === 'string' && errorMsg.includes('duplicate nonce')) {
      console.log('Builder fee already approved (duplicate nonce detected)');
      return { success: true }; // Treat as success since it's already approved
    }

    return {
      success: false,
      error: typeof errorMsg === 'string' ? errorMsg : 'Unknown error from Hyperliquid',
    };
  } catch (error) {
    console.error('submitApproveBuilderFee error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve builder fee',
    };
  }
}

// ============================================================================
// Task 1.6: Trading Functions
// ============================================================================

/**
 * Create a new position (execute trade)
 * POST /positions
 */
export async function createPosition(
  request: CreatePositionRequest
): Promise<PearPosition> {
  return authenticatedRequest<PearPosition>('/positions', {
    method: 'POST',
    body: JSON.stringify({
      longAssets: request.longAssets,
      shortAssets: request.shortAssets,
      weights: request.weights,
      executionType: 'MARKET',
    }),
  });
}

/**
 * Get all open positions
 * GET /positions
 * Note: API returns array directly, not { positions: [...] }
 */
export async function getPositions(): Promise<PearPosition[]> {
  return authenticatedRequest<PearPosition[]>('/positions', {
    method: 'GET',
  });
}

/**
 * Close a position
 * POST /positions/{positionId}/close
 */
export async function closePosition(
  positionId: string
): Promise<{ success: boolean; closedPosition: PearPosition }> {
  return authenticatedRequest<{ success: boolean; closedPosition: PearPosition }>(
    `/positions/${positionId}/close`,
    {
      method: 'POST',
      body: JSON.stringify({
        executionType: 'MARKET',
      }),
    }
  );
}

// ============================================================================
// Task 1.7: Portfolio Functions
// ============================================================================

/**
 * Hyperliquid Info API URL
 */
const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';

/**
 * Hyperliquid clearinghouse state response
 */
interface HyperliquidClearinghouseState {
  marginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  crossMarginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  withdrawable: string;
  assetPositions: unknown[];
}

/**
 * Get Hyperliquid account state including available balance
 * This queries Hyperliquid's info API directly (public, no auth required)
 */
export async function getHyperliquidAccountState(address: string): Promise<{
  accountValue: number;
  withdrawable: number;
  totalMarginUsed: number;
} | null> {
  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: address,
      }),
    });

    if (!response.ok) {
      console.error('[getHyperliquidAccountState] Error:', response.status);
      return null;
    }

    const data: HyperliquidClearinghouseState = await response.json();
    console.log('[getHyperliquidAccountState] Response:', data);

    return {
      accountValue: parseFloat(data.marginSummary?.accountValue ?? '0'),
      withdrawable: parseFloat(data.withdrawable ?? '0'),
      totalMarginUsed: parseFloat(data.marginSummary?.totalMarginUsed ?? '0'),
    };
  } catch (error) {
    console.error('[getHyperliquidAccountState] Error:', error);
    return null;
  }
}

/**
 * Get portfolio metrics
 * GET /portfolio
 * Maps API response to normalized PortfolioMetrics format
 */
export async function getPortfolio(): Promise<PortfolioMetrics> {
  const response = await authenticatedRequest<PortfolioApiResponse>('/portfolio', {
    method: 'GET',
  });

  console.log('[getPortfolio] Raw API response:', response);

  // Map API response to PortfolioMetrics
  const overall = response?.overall;
  if (!overall) {
    console.warn('[getPortfolio] No overall data in response');
    return {
      totalPositionsValue: 0,
      availableBalance: 0,
      totalUnrealizedPnL: 0,
      totalRealizedPnL: 0,
      marginUsage: 0,
    };
  }

  // Calculate realized P&L as winning - losing
  const realizedPnL = (overall.totalWinningUsd ?? 0) - (overall.totalLosingUsd ?? 0);

  return {
    totalPositionsValue: overall.currentOpenInterest ?? 0,
    availableBalance: 0, // Will be fetched from Hyperliquid API separately
    totalUnrealizedPnL: overall.unrealizedPnl ?? 0,
    totalRealizedPnL: realizedPnL,
    marginUsage: 0, // API doesn't provide margin usage directly
  };
}

/**
 * Get trade history
 * GET /trade-history
 * Note: API returns array directly, not { trades: [...] }
 */
export async function getTradeHistory(): Promise<TradeHistoryEntry[]> {
  return authenticatedRequest<TradeHistoryEntry[]>('/trade-history', {
    method: 'GET',
  });
}

// ============================================================================
// Exports
// ============================================================================

export {
  PEAR_API_BASE_URL,
  BUILDER_ADDRESS,
  ACCESS_TOKEN_EXPIRY_MS,
  REFRESH_TOKEN_EXPIRY_MS,
};
