const hre = require("hardhat");

async function main() {
  const PartyPool = await hre.ethers.getContractFactory("PartyPool");
  const partyContract = await PartyPool.deploy();
  await partyContract.deployed();
  console.log("Party Pool deployed to:", partyContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
