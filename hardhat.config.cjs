require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

task("agent", "Run the ArbiTrace agent", async (taskArgs, hre) => {
  global.hre = hre;
  const { main } = await import("./dist/index.js");
  await main();
});

module.exports = {
  solidity: "0.8.19",
  networks: {
    cronosTestnet: {
      url: "https://evm-t3.cronos.org",
      accounts: process.env.AGENT_PRIVATE_KEY ? [process.env.AGENT_PRIVATE_KEY] : [],
      chainId: 338,
    },
  },
  defaultNetwork: "cronosTestnet",
};
