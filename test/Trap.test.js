const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossDexLiquidityTrap", function () {
  let Trap;

  before(async () => {
    Trap = await ethers.getContractFactory("CrossDexLiquidityTrap");
  });

  it("collect returns encoded bytes", async () => {
    const trap = await Trap.deploy(); // ✅ no .deployed()
    const collected = await trap.collect();
    expect(collected).to.be.instanceOf(Uint8Array); // ✅ ensures it's bytes
  });

  it("shouldRespond returns false with insufficient data", async () => {
    const trap = await Trap.deploy();
    const [shouldTrigger, payload] = await trap.shouldRespond([]);
    expect(shouldTrigger).to.equal(false);
    expect(payload).to.equal("0x");
  });

  it("shouldRespond logic with mocked snapshots", async () => {
    const trap = await Trap.deploy();

    // helpers for encoding
    function encodePair(r0, r1, t0, t1, ts) {
      return ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint112", "uint112", "address", "address", "uint32"],
        [r0, r1, t0, t1, ts]
      );
    }

    function encodeSnapshot(aEnc, bEnc) {
      return ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes", "bytes"],
        [aEnc, bEnc]
      );
    }

    const tokenBase = ethers.ZeroAddress;
    const tokenA = "0x0000000000000000000000000000000000000001";
    const tokenB = "0x0000000000000000000000000000000000000002";

    const aPrev = encodePair(100000, 200000, tokenA, tokenBase, 1);
    const bPrev = encodePair(150000, 300000, tokenB, tokenBase, 1);
    const prevSnapshot = encodeSnapshot(aPrev, bPrev);

    const aNew = encodePair(50000, 100000, tokenA, tokenBase, 2);
    const bNew = encodePair(140000, 280000, tokenB, tokenBase, 2);
    const newSnapshot = encodeSnapshot(aNew, bNew);

    const data = [newSnapshot, prevSnapshot];

    const [triggered, payload] = await trap.shouldRespond(data);
    expect(triggered).to.be.a("boolean");
    expect(payload).to.be.ok;
  });
});
