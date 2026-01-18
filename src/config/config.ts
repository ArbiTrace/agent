export interface IConfig {
  CRONOS_RPC_URL: string;
  CRONOS_NETWORK: string;
  AGENT_PRIVATE_KEY: string;
  RECIPIENT_ADDRESS: string;
  ROUTER_ADDRESS: string;
  VVS_POOL_ADDRESS: string;
  USDC_ADDRESS: string;
  CRO_ADDRESS: string;
  DEFAULT_POSITION_SIZE: number;
  MIN_PROFIT_THRESHOLD: number;
  SCAN_INTERVAL_MS: number;
  MAX_POSITION_SIZE: number;
  MAX_DAILY_LOSS: number;
}

// Create CONFIG object on demand
export const CONFIG: IConfig = {
  get CRONOS_RPC_URL() { return process.env.CRONOS_RPC_URL || "https://evm.cronos.org/"; },
  get CRONOS_NETWORK() { return process.env.CRONOS_NETWORK || "mainnet"; },
  get AGENT_PRIVATE_KEY() { return process.env.AGENT_PRIVATE_KEY || ""; },
  get RECIPIENT_ADDRESS() { return process.env.RECIPIENT_ADDRESS || ""; },
  get ROUTER_ADDRESS() { return process.env.ROUTER_ADDRESS || "0x"; },
  get VVS_POOL_ADDRESS() { return process.env.VVS_POOL_ADDRESS || "0x"; },
  get USDC_ADDRESS() { return process.env.USDC_ADDRESS || "0x"; },
  get CRO_ADDRESS() { return process.env.CRO_ADDRESS || "0x"; },
  get DEFAULT_POSITION_SIZE() { return parseFloat(process.env.DEFAULT_POSITION_SIZE || "100"); },
  get MIN_PROFIT_THRESHOLD() { return parseFloat(process.env.MIN_PROFIT_THRESHOLD || "0.5"); },
  get SCAN_INTERVAL_MS() { return parseInt(process.env.SCAN_INTERVAL_MS || "30000", 10); },
  get MAX_POSITION_SIZE() { return parseFloat(process.env.MAX_POSITION_SIZE || "5000"); },
  get MAX_DAILY_LOSS() { return parseFloat(process.env.MAX_DAILY_LOSS || "500"); },
} as any;

export function validateConfig(): void {
  const required = [
    "AGENT_PRIVATE_KEY",
    "RECIPIENT_ADDRESS",
    "ROUTER_ADDRESS",
    "VVS_POOL_ADDRESS",
    "USDC_ADDRESS",
    "CRO_ADDRESS",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`❌ Missing config: ${missing.join(", ")}`);
  }

  console.log(`✅ All config values present`);
}
