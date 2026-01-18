export async function main() {
  try {
    const { initializeSigner, getSigner, contracts, formatTokenAmount } = await import("./providers/contract-provider.js");
    const { AGENT_PRIVATE_KEY, CONTRACTS, validateConfig, logger } = await import("./config/config-prod.js");
    const { orchestratorLoop } = await import("./orchestrator-prod.js");

    console.log("\n🚀 ========== ARBITRACE AGENT STARTING ==========\n");

    validateConfig();

    const signer = await initializeSigner(AGENT_PRIVATE_KEY);
    const agentAddress = await signer.getAddress();

    console.log("\n💰 ========== CHECKING TOKEN BALANCES ==========\n");

    try {
      const hre = global.hre;
      
      // Get USDC balance (6 decimals!)
      const usdcContract = contracts.usdc();
      const usdcBalance = await usdcContract.balanceOf(agentAddress);
      const usdcFormatted = hre.ethers.formatUnits(usdcBalance, 6);
      console.log(`   USDC Balance: ${usdcFormatted} USDC`);

      // Get CRO balance
      const croContract = contracts.cro();
      const croBalance = await croContract.balanceOf(agentAddress);
      const croFormatted = hre.ethers.formatUnits(croBalance, 18);
      console.log(`   CRO Balance:  ${croFormatted} CRO`);

      // Get native CRO
      const nativeBalance = await hre.ethers.provider.getBalance(agentAddress);
      const nativeFormatted = hre.ethers.formatEther(nativeBalance);
      console.log(`   Native CRO:   ${nativeFormatted} CRO\n`);

      if (usdcBalance === 0n) {
        console.log("⚠️  WARNING: USDC balance is 0. Fund your wallet to execute trades.\n");
      }
    } catch (error) {
      logger.warn(`Could not fetch balances: ${error}`);
    }

    // FUND STRATEGY VAULT (ONE-TIME SETUP)
    console.log("💰 ========== CHECKING STRATEGY VAULT ==========\n");
    
    try {
      const hre = global.hre;
      const vault = contracts.strategyVault();
      const vaultBalance = await vault.balances(CONTRACTS.USDC);
      
      console.log(`   Vault USDC Balance: ${hre.ethers.formatEther(vaultBalance)} USDC`);
      
      const requiredBalance = hre.ethers.parseEther("100");
      
      if (vaultBalance < requiredBalance) {
        console.log(`   ⚠️  Vault needs funding. Depositing 100 USDC...`);
        
        const usdcContract = contracts.usdc();
        const depositAmount = hre.ethers.parseEther("100");
        
        const approveTx = await usdcContract.approve(CONTRACTS.StrategyVault, depositAmount);
        await approveTx.wait();
        console.log(`   ✅ Vault approved`);
        
        const depositTx = await vault.deposit(CONTRACTS.USDC, depositAmount);
        await depositTx.wait();
        console.log(`   ✅ Vault funded with 100 USDC\n`);
      } else {
        console.log(`   ✅ Vault has sufficient funds\n`);
      }
    } catch (error) {
      logger.warn(`Could not fund vault: ${error}`);
    }

    console.log("🚀 ========== ARBITRACE AGENT STARTED ==========\n");
    console.log("   Scanning every 30 seconds for opportunities...\n");

    await orchestratorLoop();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
