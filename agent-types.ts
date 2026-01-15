// ============================================================================
// agent/src/models/types.ts
// Core TypeScript interfaces for the ArbiTrace AI Agent
// ============================================================================

export interface TokenPrice {
  symbol: string;
  price: number;
  currency: string;
  timestamp: number;
  source: "crypto.com" | "vvs" | "oracle";
  change24h: number;
  volume24h: number;
}

export interface PoolData {
  poolAddress: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
  price0In1: number;
  price1In0: number;
  volume24h: number;
  liquidity: number;
}

export interface ArbitrageOpportunity {
  tokenIn: string;
  tokenOut: string;
  buyExchange: "crypto.com" | "vvs";
  sellExchange: "crypto.com" | "vvs";
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  estimatedProfit: number;
  positionSize: number;
  gasCost: number;
  netProfit: number;
  confidence: number; // 0-100
  recommendation: "BUY" | "SKIP" | "MONITOR";
}

export interface TradeValidation {
  isValid: boolean;
  riskScore: number; // 0-100 (lower is better)
  reason: string;
  maxPositionSize: number;
  portfolio_exposure: number;
  daily_loss_remaining: number;
}

export interface SwapInstruction {
  path: string[];
  amountIn: bigint;
  minAmountOut: bigint;
  gasCost: number;
  expectedProfit: number;
  slippage: number;
}

export interface X402Payload {
  token: string;
  amount: bigint;
  recipient: string;
  nonce: string;
}

export interface X402Settlement {
  signature: string;
  nonce: string;
  messageHash: string;
  payload: X402Payload;
}

export interface TradeExecution {
  txHash: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: number;
  confirmationTime: number;
  blockNumber?: number;
}

export interface TradeResult {
  tradeId: string;
  timestamp: number;
  txHash: string;
  tokenIn: string;
  amountIn: bigint;
  tokenOut: string;
  amountOut: bigint;
  profit: number; // in USDC
  gasUsed: number;
  efficiency: number; // profit / gas cost
  success: boolean;
  error?: string;
}

export interface AgentState {
  isRunning: boolean;
  lastScan: number;
  totalTrades: number;
  winCount: number;
  totalProfit: number;
  maxDrawdown: number;
  currentExposure: number;
  dailyLoss: number;
  circuitBreakerActive: boolean;
  lastError?: string;
}

export interface GasInfo {
  gasPrice: number; // in gwei
  estimatedCost: number; // in USDC
  isOptimalTime: boolean;
  congestionLevel: "low" | "medium" | "high";
}

export interface HistoricalStats {
  totalTrades: number;
  winRate: number; // 0-100
  avgProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: TradeResult[];
}
