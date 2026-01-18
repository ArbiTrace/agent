import { ethers } from "ethers";
import { contracts, getSigner, logger } from "../providers/contract-provider.js";
import { CONTRACTS } from "../config/config-prod.js";

export interface ValidationResult {
  isValid: boolean;
  riskScore: number;
  portfolioExposure: number;
  issues: string[];
  warnings: string[];
}

export async function validateTrade(
  tokenA: string,
  tokenB: string,
  amountIn: bigint,
  minOut: bigint,
  maxExposure: number = 100
): Promise<ValidationResult> {
  try {
    const signer = getSigner();
    const userAddress = await signer.getAddress();

    const usdc = contracts.usdc();
    const userBalance = await usdc.balanceOf(userAddress);

    const vvsRouterAddress = CONTRACTS.VVSRouter;
    const currentAllowance = await usdc.allowance(userAddress, vvsRouterAddress);

    const issues: string[] = [];
    const warnings: string[] = [];

    if (userBalance < amountIn) {
      issues.push(
        `Insufficient balance: ${ethers.formatEther(userBalance)} < ${ethers.formatEther(amountIn)}`
      );
    }

    if (currentAllowance < amountIn) {
      warnings.push(
        `Approval needed: ${ethers.formatEther(currentAllowance)} < ${ethers.formatEther(amountIn)}`
      );
    }

    const portfolioExposure = (parseFloat(ethers.formatEther(amountIn)) / maxExposure) * 100;
    if (portfolioExposure > 50) {
      warnings.push(
        `High exposure: ${portfolioExposure.toFixed(2)}% of max (${maxExposure})`
      );
    }

    const riskScore = Math.min(
      100,
      (portfolioExposure / 100) * 50 + (issues.length * 20)
    );

    logger.debug(
      `Trade Validation: Risk=${riskScore.toFixed(0)}/100, Exposure=${portfolioExposure.toFixed(2)}%, Valid=${issues.length === 0}`
    );

    return {
      isValid: issues.length === 0,
      riskScore,
      portfolioExposure,
      issues,
      warnings,
    };
  } catch (error) {
    logger.error(`Validation failed: ${error}`);
    throw error;
  }
}
