const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossDexLiquidityTrap", function () {
  let Trap, trap;

  beforeEach(async function () {
    Trap = await ethers.getContractFactory("CrossDexLiquidityTrap");
    trap = await Trap.deploy(); // ✅ no .deployed() needed
  });

  it("collect returns encoded bytes", async function () {
    const data = await trap.collect();
    expect(data).to.be.instanceOf(Uint8Array); // ✅ bytes check
  });

  it("shouldRespond returns false with insufficient data", async function () {
    const [shouldTrigger, payload] = await trap.shouldRespond([]);
    expect(shouldTrigger).to.equal(false);
    expect(payload).to.equal("0x");
  });
});
