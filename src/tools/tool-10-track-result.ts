import { ethers } from "ethers";
import { contracts, getProvider, logger } from "../providers/contract-provider.js";

export interface TradeResult {
  tradeId: string;
  amountIn: bigint;
  amountOut: bigint;
  profit: bigint;
  efficiency: number;
  status: "success" | "pending" | "failed";
  blockNumber: number;
}

export async function trackTradeResult(
  txHash: string,
  tokenA: string,
  tokenB: string,
  agentAddress: string
): Promise<TradeResult> {
  try {
    const provider = getProvider();
    const cro = contracts.cro();

    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      throw new Error("Transaction not found");
    }

    const agentBalance = await cro.balanceOf(agentAddress);

    logger.debug(
      `Trade result: Agent balance = ${ethers.formatEther(agentBalance)} CRO`
    );

    const tradeId = `trade_${Date.now()}`;
    const amountIn = ethers.parseEther("1");
    const amountOut = agentBalance;
    const profit = amountOut > amountIn ? amountOut - amountIn : 0n;
    const efficiency = amountOut > 0n ? parseFloat(ethers.formatEther(amountOut)) / 100 : 0;

    return {
      tradeId,
      amountIn,
      amountOut,
      profit,
      efficiency,
      status: receipt.status === 1 ? "success" : "failed",
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    logger.error(`Failed to track trade result: ${error}`);
    throw error;
  }
}
