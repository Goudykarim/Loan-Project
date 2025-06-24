require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// --- TEMPORary DEBUGGING CODE ---
const privateKey = process.env.PRIVATE_KEY;
console.log("--- DEBUG INFO ---");
console.log(`The private key Hardhat is reading is: "${privateKey}"`);
if (!privateKey) {
  console.log("Result: The private key is undefined. The .env file may be in the wrong folder or not being read.");
} else {
  console.log(`Result: The private key has a length of ${privateKey.length} characters.`);
}
console.log("--------------------");
// --- END DEBUGGING CODE ---


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};