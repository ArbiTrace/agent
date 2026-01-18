import { ethers } from "ethers";

import dotenv from "dotenv";

dotenv.config();

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

const RPC_URL = process.env.RPC_URL || "https://evm-t3.cronos.org";

const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY || "";

const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || "";

const LOG_LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase();

// ============================================================
// TRADING PARAMETERS
// ============================================================

const DEFAULT_POSITION_SIZE = parseFloat(process.env.DEFAULT_POSITION_SIZE || "1");

const MIN_SPREAD_PERCENT = parseFloat(process.env.MIN_SPREAD_PERCENT || "0.5");

const MAX_PORTFOLIO_EXPOSURE = parseFloat(process.env.MAX_PORTFOLIO_EXPOSURE || "100");

const SCAN_INTERVAL_MS = parseInt(process.env.SCAN_INTERVAL_MS || "30000");

// ============================================================
// SMART CONTRACT ADDRESSES (UPDATED - NEW TOKENS)
// ============================================================

const CONTRACTS = {
  // NEW token addresses (as provided)
  USDC: process.env.CONTRACT_USDC || "0x871be6C64c961DE141De862CBdD27DDeBB9DeCd7",
  CRO: process.env.CONTRACT_CRO || "0xa9d4b4f1AE414aDF72136A6aA4beb6CE466ADEB0",

  // DEX & Router addresses
  VVSRouter: process.env.CONTRACT_VVS_ROUTER || "0x3640a1271AB6735E7B29345E90d3C33529Eb9a8b",
  CEXRouter: process.env.CONTRACT_CEX_ROUTER || "0x7D79fc81C45c320f7cd29799e1288869d236F99f",

  // Strategy & Settlement contracts
  ArbiTraceRouter: process.env.CONTRACT_ARBITRACE_ROUTER || "0xfE59389803aB4242A65059056cCd85Eec88f70D3",
  X402Settler: process.env.CONTRACT_X402_SETTLER || "0x5b7B948D3Ffd6147a4A662632387159D1A1c6dA4",
  StrategyVault: process.env.CONTRACT_STRATEGY_VAULT || "0x3200dA9D020B77EbB9Ce4C73eFDd97E826C8Fb5c",
};

// ============================================================
// LOGGING UTILITY
// ============================================================

const LogLevels: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel = LogLevels[LOG_LEVEL] ?? 1;

export const logger = {
  debug: (...args: any[]) => currentLogLevel <= 0 && console.debug("[DEBUG]", ...args),
  info: (...args: any[]) => currentLogLevel <= 1 && console.log("[INFO]", ...args),
  warn: (...args: any[]) => currentLogLevel <= 2 && console.warn("[WARN]", ...args),
  error: (...args: any[]) => currentLogLevel <= 3 && console.error("[ERROR]", ...args),
};

// ============================================================
// VALIDATION
// ============================================================

export function validateConfig(): void {
  const errors: string[] = [];

  if (!AGENT_PRIVATE_KEY) errors.push("AGENT_PRIVATE_KEY not set");
  if (!RECIPIENT_ADDRESS) errors.push("RECIPIENT_ADDRESS not set");

  try {
    ethers.getAddress(RECIPIENT_ADDRESS);
  } catch {
    errors.push("RECIPIENT_ADDRESS is invalid");
  }

  if (errors.length > 0) {
    console.error("❌ Configuration Errors:");
    errors.forEach((err) => console.error(` - ${err}`));
    process.exit(1);
  }

  console.log("✅ Configuration validated");
  console.log(` RPC: ${RPC_URL}`);
  console.log(` Agent: ${new ethers.Wallet(AGENT_PRIVATE_KEY).address}`);
  console.log(` Recipient: ${RECIPIENT_ADDRESS}`);
}

// ============================================================
// EXPORTS
// ============================================================

export const CONFIG = {
  DEFAULT_POSITION_SIZE,
  MIN_SPREAD_PERCENT,
  MAX_PORTFOLIO_EXPOSURE,
  SCAN_INTERVAL_MS,
};

export {
  RPC_URL,
  AGENT_PRIVATE_KEY,
  RECIPIENT_ADDRESS,
  LOG_LEVEL,
  DEFAULT_POSITION_SIZE,
  MIN_SPREAD_PERCENT,
  MAX_PORTFOLIO_EXPOSURE,
  SCAN_INTERVAL_MS,
  CONTRACTS,
};
