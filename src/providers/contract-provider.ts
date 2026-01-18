import { CONTRACTS, logger } from "../config/config-prod.js";

// Get hre from global (set by hardhat task)
declare global {
  var hre: any;
}

// ============================================================
// ABI DEFINITIONS
// ============================================================

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
];

const DEX_ROUTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, address to) external returns (uint amountA, uint amountB, uint liquidity)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to) external returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
];

const ARBITRACE_ROUTER_ABI = [
  "function executeStrategy(address tokenIn, uint256 amountIn, address[] calldata path, uint256 minAmountOut) external returns (bool)",
];

const X402_SETTLER_ABI = [
  "function executeSettlementWithSig(address token, uint256 amount, address recipient, bytes32 nonce, bytes calldata signature) external returns (bool)",
];

const STRATEGY_VAULT_ABI = [
  "function deposit(address token, uint256 amount) external",
  "function balances(address token) external view returns (uint256)",
];

// ============================================================
// PROVIDER & SIGNER
// ============================================================
let signer: any = null;

export async function initializeSigner(privateKey: string): Promise<any> {
  if (!signer) {
    const hre = global.hre;
    if (!hre || !hre.ethers) {
      throw new Error("Hardhat not initialized. Run via: npx hardhat agent");
    }
    
    signer = new hre.ethers.Wallet(privateKey, hre.ethers.provider);
    logger.info(`✅ Signer initialized: ${await signer.getAddress()}`);
  }
  return signer;
}

export function getProvider(): any {
  const hre = global.hre;
  if (!hre || !hre.ethers) {
    throw new Error("Hardhat not initialized");
  }
  return hre.ethers.provider;
}

export function getSigner(): any {
  if (!signer) throw new Error("Signer not initialized");
  return signer;
}

// ============================================================
// CONTRACT INSTANCES
// ============================================================

export const contracts = {
  usdc: () => {
    const hre = global.hre;
    return new hre.ethers.Contract(CONTRACTS.USDC, ERC20_ABI, getSigner());
  },
  cro: () => {
    const hre = global.hre;
    return new hre.ethers.Contract(CONTRACTS.CRO, ERC20_ABI, getSigner());
  },
  vvsRouter: () => {
    const hre = global.hre;
    return new hre.ethers.Contract(CONTRACTS.VVSRouter, DEX_ROUTER_ABI, getSigner());
  },
  cexRouter: () => {
    const hre = global.hre;
    return new hre.ethers.Contract(CONTRACTS.CEXRouter, DEX_ROUTER_ABI, getSigner());
  },
  arbiTraceRouter: () => {
    const hre = global.hre;
    return new hre.ethers.Contract(CONTRACTS.ArbiTraceRouter, ARBITRACE_ROUTER_ABI, getSigner());
  },
  x402Settler: () => {
    const hre = global.hre;
    return new hre.ethers.Contract(CONTRACTS.X402Settler, X402_SETTLER_ABI, getSigner());
  },
  strategyVault: () => {
    const hre = global.hre;
    return new hre.ethers.Contract(CONTRACTS.StrategyVault, STRATEGY_VAULT_ABI, getSigner());
  },
  vvsRouterReadOnly: () => {
    const hre = global.hre;
    return new hre.ethers.Contract(CONTRACTS.VVSRouter, DEX_ROUTER_ABI, hre.ethers.provider);
  },
  cexRouterReadOnly: () => {
    const hre = global.hre;
    return new hre.ethers.Contract(CONTRACTS.CEXRouter, DEX_ROUTER_ABI, hre.ethers.provider);
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const hre = global.hre;
  return hre.ethers.formatUnits(amount, decimals);
}

export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  const hre = global.hre;
  return hre.ethers.parseUnits(amount, decimals);
}

export { logger };
