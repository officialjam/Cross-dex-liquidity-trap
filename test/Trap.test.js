const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossDexLiquidityTrap", function () {
  let Trap;

  before(async () => {
    Trap = await ethers.getContractFactory("CrossDexLiquidityTrap");
  });

  it("collect returns encoded bytes (hex string)", async () => {
    const trap = await Trap.deploy();
    const collected = await trap.collect();
    expect(typeof collected).to.equal("string");
    expect(collected.startsWith("0x")).to.equal(true);
  });

  it("shouldRespond returns false with insufficient data", async () => {
    const trap = await Trap.deploy();
    const res = await trap.shouldRespond([]);
    const shouldTrigger = res[0];
    const payload = res[1];
    expect(shouldTrigger).to.equal(false);
    // decode payload to string
    const decoded = ethers.toUtf8String ? ethers.toUtf8String(payload) : ethers.utils.toUtf8String(payload);
    expect(decoded).to.equal("insufficient-data");
  });

  it("shouldRespond logic with mocked snapshots", async () => {
    const trap = await Trap.deploy();

    const abi = new ethers.AbiCoder();

    function encodePair(r0, r1, t0, t1, ts) {
      return abi.encode(["uint112","uint112","address","address","uint32"], [r0, r1, t0, t1, ts]);
    }

    function encodeSnapshot(aEnc, bEnc) {
      return abi.encode(["bytes","bytes"], [aEnc, bEnc]);
    }

    const tokenBase = ethers.ZeroAddress || ethers.constants.AddressZero;
    const tokenA = "0x0000000000000000000000000000000000000001";
    const tokenB = "0x0000000000000000000000000000000000000002";

    const aPrev = encodePair(100000, 200000, tokenA, tokenBase, 1);
    const bPrev = encodePair(150000, 300000, tokenB, tokenBase, 1);
    const prevSnapshot = encodeSnapshot(aPrev, bPrev);

    const aNew = encodePair(50000, 100000, tokenA, tokenBase, 2);
    const bNew = encodePair(140000, 280000, tokenB, tokenBase, 2);
    const newSnapshot = encodeSnapshot(aNew, bNew);

    const data = [newSnapshot, prevSnapshot];

    const res = await trap.shouldRespond(data);
    expect(typeof res[0]).to.equal("boolean");
    expect(res[1]).to.be.ok;
  });
});
