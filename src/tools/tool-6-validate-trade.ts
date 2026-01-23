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
  tokenA: string, // USDC
  tokenB: string, // CRO
  amountIn: bigint,
  minOut: bigint,
  maxExposure: number = 100,
  targetUser?: string
): Promise<ValidationResult> {
  try {
    const signer = getSigner();
    const agentAddress = await signer.getAddress();

    let availableBalance = 0n;

    if (targetUser) {
      // Check User's Balance in the Strategy Vault
      const vault = contracts.strategyVault();
      availableBalance = await vault.userBalances(targetUser, tokenA);
      logger.debug(`Checking Vault balance for ${targetUser}: ${ethers.formatUnits(availableBalance, 18)} USDC`);
    } else {
      // Fallback: Check Agent's Wallet Balance
      const usdc = contracts.usdc();
      availableBalance = await usdc.balanceOf(agentAddress);
    }

    const issues: string[] = [];
    const warnings: string[] = [];

    if (availableBalance < amountIn) {
      issues.push(
        `Insufficient balance: ${ethers.formatUnits(availableBalance, 18)} < ${ethers.formatUnits(amountIn, 18)}`
      );
    }

    // Exposure check
    const portfolioExposure = (parseFloat(ethers.formatUnits(amountIn, 18)) / maxExposure) * 100;
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
