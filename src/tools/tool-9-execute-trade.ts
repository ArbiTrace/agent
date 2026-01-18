import { contracts, getSigner } from "../providers/contract-provider.js";
import { CONTRACTS, logger } from "../config/config-prod.js";

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
    
    // ===== TRY ENCODING FIRST =====
    try {
      const encodedData = arbiTraceRouter.interface.encodeFunctionData(
        "executeStrategy",
        [tokenIn, amountIn, swapPath, minAmountOut]
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
    
    // EXECUTE SETTLEMENT (matches simulate_trades.js line 120)
    // This moves CRO from ArbiTraceRouter contract → recipient wallet
    const x402Settler = contracts.x402Settler();
    const tx = await x402Settler.executeSettlementWithSig(
      token,
      amount,
      recipient,
      nonce,
      signature,
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
