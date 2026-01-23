import { contracts, getSigner } from "../providers/contract-provider.js";
import { CONTRACTS, RECIPIENT_ADDRESS, logger } from "../config/config-prod.js";

export interface ExecutionResult {
  txHash: string;
  success: boolean;
  status: "pending" | "confirmed" | "failed";
  error?: string;
}

export async function executeTrade(
  tokenIn: string,
  amountIn: bigint,
  swapPath: string[],
  minAmountOut: bigint
): Promise<ExecutionResult> {
  try {
    const hre = global.hre;

    // ===== DEBUG LOGGING =====
    logger.info(`🔍 DEBUG - Input Parameters:`);
    logger.info(`   tokenIn: ${tokenIn} (type: ${typeof tokenIn})`);
    logger.info(`   amountIn: ${amountIn} (type: ${typeof amountIn})`);
    logger.info(`   swapPath: ${JSON.stringify(swapPath)} (type: ${typeof swapPath}, isArray: ${Array.isArray(swapPath)})`);
    logger.info(`   minAmountOut: ${minAmountOut} (type: ${typeof minAmountOut})`);

    // Validate addresses
    if (!hre.ethers.isAddress(tokenIn)) {
      throw new Error(`Invalid tokenIn address: ${tokenIn}`);
    }
    for (const addr of swapPath) {
      if (!hre.ethers.isAddress(addr)) {
        throw new Error(`Invalid path address: ${addr}`);
      }
    }
    // ===== END DEBUG =====

    logger.info(
      `🚀 Executing trade via ArbiTraceRouter: ${hre.ethers.formatUnits(amountIn, 18)} in, ${hre.ethers.formatUnits(minAmountOut, 18)} min out`
    );

    const arbiTraceRouter = contracts.arbiTraceRouter();

    // Use Connected User (Dynamic) -> Fallback to Env Recipient
    let targetUser = RECIPIENT_ADDRESS;

    // Check if we have a real user connected via WebSocket
    const { inMemoryStore } = await import("../websocket-server.js");
    if (inMemoryStore.connectedUser) {
      targetUser = inMemoryStore.connectedUser;
      logger.info(`🎯 Dynamic Target: Using Connected User: ${targetUser}`);
    } else {
      logger.warn(`⚠️ No user connected via WS. Fallback to ENV Recipient: ${targetUser}`);
    }

    logger.info(`🎯 Executing strategy for: ${targetUser}`);

    // ===== TRY ENCODING FIRST =====
    try {
      const encodedData = arbiTraceRouter.interface.encodeFunctionData(
        "executeStrategy",
        [tokenIn, amountIn, swapPath, minAmountOut, targetUser]
      );
      logger.info(`✅ Function encoding successful, data length: ${encodedData.length}`);
    } catch (encodeError) {
      logger.error(`❌ Function encoding failed: ${encodeError}`);
      throw encodeError;
    }
    // ===== END ENCODING TEST =====

    const tx = await arbiTraceRouter.executeStrategy(
      tokenIn,
      amountIn,
      swapPath,
      minAmountOut,
      targetUser,
      { gasLimit: 500_000 }
    );

    const receipt = await tx.wait();
    logger.info(`✅ Strategy executed: ${receipt.hash}`);

    return {
      txHash: receipt.hash || receipt.transactionHash || "",
      success: true,
      status: "confirmed",
    };
  } catch (error) {
    logger.error(`Trade execution failed: ${error}`);
    return {
      txHash: "",
      success: false,
      status: "failed",
      error: String(error),
    };
  }
}


export async function executeSettlement(
  token: string,
  amount: bigint,
  recipient: string,
  signature: string,
  nonce: string
): Promise<string> {
  try {
    const hre = global.hre;

    logger.info(`🚚 Executing settlement for ${hre.ethers.formatUnits(amount, 18)} of ${token}`);

    // VALIDATE INPUTS
    if (!hre.ethers.isAddress(token)) {
      throw new Error(`Invalid token address: ${token}`);
    }
    if (!hre.ethers.isAddress(recipient)) {
      throw new Error(`Invalid recipient address: ${recipient}`);
    }
    if (!signature || !signature.startsWith('0x')) {
      throw new Error(`Invalid signature format: ${signature}`);
    }
    if (!nonce || !nonce.startsWith('0x')) {
      throw new Error(`Invalid nonce format: ${nonce}`);
    }

    // SIMPLIFIED SETTLEMENT: Call router directly
    // Router's settleWithSplit will transfer all profit to recipient
    const arbiTraceRouter = contracts.arbiTraceRouter();

    logger.info(`🔍 Settlement Debug:`);
    logger.info(`   Router: ${await arbiTraceRouter.getAddress()}`);
    logger.info(`   Token: ${token}`);
    logger.info(`   Amount: ${amount.toString()}`);
    logger.info(`   Recipient: ${recipient}`);

    const tx = await arbiTraceRouter.settleWithSplit(
      token,
      amount,
      recipient,
      { gasLimit: 300_000 }
    );

    const receipt = await tx.wait();

    // CHECK FOR REVERT
    if (!receipt || receipt.status === 0) {
      throw new Error(`Settlement reverted (status: ${receipt?.status})`);
    }

    logger.info(`✅ Settlement: ${receipt.hash}`);
    return receipt.hash || receipt.transactionHash || "";

  } catch (error) {
    logger.error(`Settlement failed: ${error}`);
    throw error;
  }
}
