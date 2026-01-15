// agent/src/utils/types.ts
// All TypeScript types in ONE place - easy to reference

// Market Data
export interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

export interface PoolData {
  poolAddress: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
  price0In1: number;
  price1In0: number;
  liquidity: number;
}

// Opportunity Detection
export interface ArbitrageOpportunity {
  tokenIn: string;
  tokenOut: string;
  buyExchange: "CEX" | "DEX";
  sellExchange: "CEX" | "DEX";
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  grossProfit: number;
  gasCostEstimate: number;
  netProfit: number;
  confidence: number; // 0-100
  recommendation: "BUY" | "SKIP" | "MONITOR";
}

// Trade Validation
export interface TradeValidation {
  isValid: boolean;
  riskScore: number; // 0-100
  reason: string;
  checks: {
    positionSizeOk: boolean;
    exposureOk: boolean;
    dailyLossOk: boolean;
    circuitBreakerOk: boolean;
  };
}

// Swap Details
export interface SwapInstruction {
  path: string[];
  amountIn: bigint;
  minAmountOut: bigint;
  gasCost: number;
  expectedProfit: number;
}

// x402 Settlement
export interface X402Payload {
  token: string;
  amount: bigint;
  recipient: string;
  nonce: string;
}

export interface X402Signature {
  payload: X402Payload;
  signature: string;
  messageHash: string;
  agentAddress: string;
}

// Trade Execution
export interface TradeExecution {
  txHash: string;
  status: "pending" | "confirmed" | "failed";
  blockNumber?: number;
  gasUsed?: number;
  error?: string;
}

// Trade Result
export interface TradeResult {
  tradeId: string;
  timestamp: number;
  txHash: string;
  amountIn: bigint;
  amountOut: bigint;
  grossProfit: number;
  gasCost: number;
  netProfit: number;
  efficiency: number; // netProfit / gasCost
  success: boolean;
  error?: string;
}

// Agent State
export interface AgentState {
  isRunning: boolean;
  totalScans: number;
  totalTrades: number;
  winCount: number;
  totalGrossProfit: number;
  totalNetProfit: number;
  totalGasCost: number;
  dailyLoss: number;
  circuitBreakerActive: boolean;
  lastError?: string;
  lastScanTime: number;
}
