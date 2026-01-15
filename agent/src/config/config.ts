// agent/src/config/config.ts
// Central configuration file - all constants in one place

import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  // ==================== BLOCKCHAIN ====================
  CRONOS_RPC_URL: process.env.CRONOS_RPC_URL || "https://evm-t3.cronos.org",
  CRONOS_NETWORK: process.env.CRONOS_NETWORK || "testnet",
  CHAIN_ID: process.env.CRONOS_NETWORK === "mainnet" ? 25 : 338,

  // ==================== CONTRACT ADDRESSES ====================
  ROUTER_ADDRESS: process.env.ROUTER_ADDRESS || "",
  VAULT_ADDRESS: process.env.VAULT_ADDRESS || "",
  SETTLER_ADDRESS: process.env.SETTLER_ADDRESS || "",
  VVS_POOL_ADDRESS: process.env.VVS_POOL_ADDRESS || "",

  // ==================== TOKEN ADDRESSES ====================
  USDC_ADDRESS: process.env.USDC_ADDRESS || "",
  CRO_ADDRESS: process.env.CRO_ADDRESS || "",

  // ==================== AGENT KEYS ====================
  AGENT_PRIVATE_KEY: process.env.AGENT_PRIVATE_KEY || "",
  RECIPIENT_ADDRESS: process.env.RECIPIENT_ADDRESS || "",

  // ==================== EXTERNAL APIs ====================
  CRYPTO_COM_MCP_API_KEY: process.env.CRYPTO_COM_MCP_API_KEY || "",
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || "",

  // ==================== RISK PARAMETERS ====================
  MAX_POSITION_SIZE: parseInt(process.env.MAX_POSITION_SIZE || "5000"),
  MAX_DAILY_LOSS: parseFloat(process.env.MAX_DAILY_LOSS || "5"),
  MIN_PROFIT_THRESHOLD: parseFloat(process.env.MIN_PROFIT_THRESHOLD || "0.5"),
  MAX_SLIPPAGE: parseFloat(process.env.MAX_SLIPPAGE || "0.003"),
  CIRCUIT_BREAKER_LOSS_THRESHOLD: parseFloat(process.env.CIRCUIT_BREAKER_LOSS_THRESHOLD || "250"),

  // ==================== POLLING & TIMING ====================
  SCAN_INTERVAL_MS: parseInt(process.env.SCAN_INTERVAL_MS || "30000"),
  CONFIRMATION_TIMEOUT_MS: parseInt(process.env.CONFIRMATION_TIMEOUT_MS || "30000"),

  // ==================== DEFAULTS ====================
  DEFAULT_POSITION_SIZE: 1000, // USDC
};

// Validation
export function validateConfig() {
  const required = [
    "ROUTER_ADDRESS",
    "VAULT_ADDRESS",
    "SETTLER_ADDRESS",
    "USDC_ADDRESS",
    "CRO_ADDRESS",
    "AGENT_PRIVATE_KEY",
    "RECIPIENT_ADDRESS",
  ];

  for (const key of required) {
    if (!CONFIG[key as keyof typeof CONFIG]) {
      throw new Error(`Missing required config: ${key}`);
    }
  }

  console.log("✅ Configuration validated");
}
