// ============================================================================
// agent/src/tools/execution.ts
// Tools 6-10: Trade Execution & Settlement
// ============================================================================

import {
  TradeValidation,
  SwapInstruction,
  X402Settlement,
  X402Payload,
  TradeExecution,
  TradeResult,
} from "../models/types";
import { ethers } from "ethers";

/**
 * TOOL 6: Validate trade before execution (Risk checks)
 * @param positionSize Trade size in USDC
 * @param currentExposure Current portfolio exposure
 * @param dailyLoss Current daily loss
 * @param MAX_POSITION_SIZE Max allowed position
 * @param MAX_DAILY_LOSS Max daily loss limit
 * @returns TradeValidation with risk assessment
 */
export function validate_trade_opportunity(
  positionSize: number,
  currentExposure: number,
  dailyLoss: number,
  MAX_POSITION_SIZE: number,
  MAX_DAILY_LOSS: number
): TradeValidation {
  console.log(`🔍 Validating trade (size: ${positionSize} USDC)...`);

  let isValid = true;
  let riskScore = 0;
  let reasons: string[] = [];

  // Check 1: Position size
  if (positionSize > MAX_POSITION_SIZE) {
    isValid = false;
    riskScore += 40;
    reasons.push(`Position size $${positionSize} exceeds max $${MAX_POSITION_SIZE}`);
  } else {
    riskScore += Math.round((positionSize / MAX_POSITION_SIZE) * 20);
  }

  // Check 2: Portfolio exposure
  const newExposure = currentExposure + positionSize;
  if (newExposure > MAX_POSITION_SIZE * 3) {
    isValid = false;
    riskScore += 30;
    reasons.push(`Portfolio exposure too high: $${newExposure.toFixed(2)}`);
  }

  // Check 3: Daily loss
  const MAX_LOSS_AMOUNT = MAX_POSITION_SIZE * (MAX_DAILY_LOSS / 100);
  if (Math.abs(dailyLoss) > MAX_LOSS_AMOUNT) {
    isValid = false;
    riskScore += 30;
    reasons.push(`Daily loss limit exceeded: $${dailyLoss.toFixed(2)}`);
  }

  return {
    isValid,
    riskScore: Math.min(riskScore, 100),
    reason: isValid ? "✅ All checks passed" : reasons.join("; "),
    maxPositionSize: MAX_POSITION_SIZE,
    portfolio_exposure: newExposure,
    daily_loss_remaining: MAX_LOSS_AMOUNT - Math.abs(dailyLoss),
  };
}

/**
 * TOOL 7: Build swap instruction (path, amounts, slippage)
 * @param tokenIn Input token address
 * @param tokenOut Output token address
 * @param amountIn Amount to swap
 * @param minPrice Minimum acceptable output price
 * @param gasCost Estimated gas cost in USDC
 * @returns SwapInstruction with optimized parameters
 */
export function build_swap_instruction(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  minPrice: number,
  gasCost: number
): SwapInstruction {
  console.log(`🔨 Building swap instruction...`);

  // Calculate minimum output with 0.3% slippage buffer
  const slippage = 0.003;
  const minAmountOut = BigInt(
    Math.floor(Number(amountIn) * minPrice * (1 - slippage))
  );

  const expectedOutput = Number(amountIn) * minPrice;
  const expectedProfit = expectedOutput - Number(amountIn) - gasCost;

  return {
    path: [tokenIn, tokenOut],
    amountIn,
    minAmountOut,
    gasCost,
    expectedProfit,
    slippage: slippage * 100,
  };
}

/**
 * TOOL 8: Sign x402 settlement payload with agent's private key
 * @param token Token to settle
 * @param amount Amount to settle
 * @param recipient Recipient address
 * @param agentPrivateKey Agent's signing key
 * @returns X402Settlement with signature and nonce
 */
export async function sign_x402_settlement(
  token: string,
  amount: bigint,
  recipient: string,
  agentPrivateKey: string
): Promise<X402Settlement> {
  console.log(`🔐 Signing x402 settlement payload...`);

  try {
    // Create unique nonce
    const nonce = ethers.hexlify(ethers.randomBytes(32));

    // Reconstruct payload hash (matches smart contract)
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "address", "bytes32"],
      [token, amount, recipient, nonce]
    );

    // Create agent wallet and sign
    const agentWallet = new ethers.Wallet(agentPrivateKey);
    const signature = await agentWallet.signMessage(ethers.getBytes(messageHash));

    return {
      signature,
      nonce,
      messageHash,
      payload: {
        token,
        amount,
        recipient,
        nonce,
      },
    };
  } catch (error) {
    console.error("❌ Signature failed:", error);
    throw new Error(`Failed to sign settlement: ${error}`);
  }
}

/**
 * TOOL 9: Execute arbitrage trade on-chain
 * @param routerAddress ArbiTraceRouter contract address
 * @param swapPath Token swap path
 * @param amountIn Input amount
 * @param minAmountOut Minimum output
 * @param signer Transaction signer
 * @returns TradeExecution with transaction hash and status
 */
export async function execute_arbitrage_trade(
  routerAddress: string,
  swapPath: string[],
  amountIn: bigint,
  minAmountOut: bigint,
  signer: ethers.Signer
): Promise<TradeExecution> {
  console.log(`🚀 Executing trade on-chain...`);

  try {
    // In production: actual contract call
    // const router = ArbiTraceRouter__factory.connect(routerAddress, signer);
    // const tx = await router.executeStrategy(swapPath[0], amountIn, swapPath, minAmountOut);
    // const receipt = await tx.wait();

    // Mock execution
    const txHash = ethers.hexlify(ethers.randomBytes(32));
    const timestamp = Date.now();

    return {
      txHash,
      status: "pending",
      timestamp,
      confirmationTime: 0,
    };
  } catch (error) {
    console.error("❌ Trade execution failed:", error);
    throw new Error(`Failed to execute trade: ${error}`);
  }
}

/**
 * TOOL 10: Track trade result and update analytics
 * @param tradeId Unique trade identifier
 * @param txHash Transaction hash
 * @param amountIn Input amount
 * @param amountOut Output amount
 * @param gasCost Gas cost in USDC
 * @param success Whether trade succeeded
 * @returns TradeResult with full analytics
 */
export function track_trade_result(
  tradeId: string,
  txHash: string,
  amountIn: bigint,
  amountOut: bigint,
  gasCost: number,
  success: boolean
): TradeResult {
  console.log(`📊 Tracking trade result: ${tradeId}`);

  const profit = Number(amountOut) - Number(amountIn) - gasCost;
  const efficiency = gasCost > 0 ? profit / gasCost : 0;

  // In production: save to database
  // db.trades.insert({ tradeId, txHash, amountIn, amountOut, profit, gasCost, timestamp });

  return {
    tradeId,
    timestamp: Date.now(),
    txHash,
    tokenIn: "USDC",
    amountIn,
    tokenOut: "CRO",
    amountOut,
    profit,
    gasUsed: Math.round(gasCost / 0.0000005), // rough estimation
    efficiency,
    success,
    error: success ? undefined : "Trade reverted on-chain",
  };
}

/**
 * Export all execution tools as an array (for tool registry)
 */
export const executionTools = [
  {
    name: "validate_trade_opportunity",
    description: "Validate trade against risk limits",
    handler: validate_trade_opportunity,
  },
  {
    name: "build_swap_instruction",
    description: "Build optimized swap instruction",
    handler: build_swap_instruction,
  },
  {
    name: "sign_x402_settlement",
    description: "Sign x402 settlement payload",
    handler: sign_x402_settlement,
  },
  {
    name: "execute_arbitrage_trade",
    description: "Execute trade on-chain",
    handler: execute_arbitrage_trade,
  },
  {
    name: "track_trade_result",
    description: "Track and log trade results",
    handler: track_trade_result,
  },
];
