import { ethers } from "ethers";

import { getProvider } from "../providers/contract-provider.js";

import { logger } from "../config/config-prod.js";

export interface GasInfo {
  gasPrice: bigint;
  estimatedGasUnits: number;
  estimatedGasCost: bigint;
  estimatedGasCostUSDC: number;
}

export async function estimateSwapGas(
  estimatedUnits: number = 150000
): Promise<GasInfo> {
  try {
    const provider = getProvider();
    
    // Use getFeeData() for ethers v6
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    
    const estimatedGasCost = BigInt(estimatedUnits) * gasPrice;
    const estimatedGasCostUSDC = parseFloat(ethers.formatEther(estimatedGasCost));

    logger.debug(
      `Gas Estimate: ${estimatedUnits} units @ ${ethers.formatUnits(gasPrice, "gwei")} gwei = ${estimatedGasCostUSDC.toFixed(6)} USDC`
    );

    return {
      gasPrice,
      estimatedGasUnits: estimatedUnits,
      estimatedGasCost,
      estimatedGasCostUSDC,
    };
  } catch (error) {
    logger.error(`Failed to estimate gas: ${error}`);
    throw error;
  }
}
