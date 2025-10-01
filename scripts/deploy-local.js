// simple deploy script (stateless contract - constants edited in contract file if needed)
const hre = require("hardhat");

async function main() {
  const Trap = await hre.ethers.getContractFactory("CrossDexLiquidityTrap");
  const trap = await Trap.deploy();
  await trap.deployed();
  console.log("CrossDexLiquidityTrap deployed to:", trap.address);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
