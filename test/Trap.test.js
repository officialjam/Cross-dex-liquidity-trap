const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CrossDexLiquidityTrap', function () {
  let Trap;
  before(async () => {
    Trap = await ethers.getContractFactory('CrossDexLiquidityTrap');
  });

  it('collect returns encoded bytes', async () => {
    const trap = await Trap.deploy();
    await trap.deployed();
    const collected = await trap.collect();
    expect(collected).to.be.ok;
  });

  it('shouldRespond returns false with insufficient data', async () => {
    const trap = await Trap.deploy();
    await trap.deployed();
    const tx = await trap.shouldRespond([]);
    expect(tx[0]).to.equal(false);
  });

  it('shouldRespond logic with mocked snapshots', async () => {
    const trap = await Trap.deploy();
    await trap.deployed();

    function encodePair(r0, r1, t0, t1, ts) {
      return ethers.utils.defaultAbiCoder.encode(['uint112','uint112','address','address','uint32'], [r0, r1, t0, t1, ts]);
    }

    function encodeSnapshot(aEnc, bEnc) {
      return ethers.utils.defaultAbiCoder.encode(['bytes','bytes'], [aEnc, bEnc]);
    }

    const tokenBase = ethers.constants.AddressZero;
    const tokenA = '0x0000000000000000000000000000000000000001';
    const tokenB = '0x0000000000000000000000000000000000000002';

    const aPrev = encodePair(100000, 200000, tokenA, tokenBase, 1);
    const bPrev = encodePair(150000, 300000, tokenB, tokenBase, 1);
    const prevSnapshot = encodeSnapshot(aPrev, bPrev);

    const aNew = encodePair(50000, 100000, tokenA, tokenBase, 2);
    const bNew = encodePair(140000, 280000, tokenB, tokenBase, 2);
    const newSnapshot = encodeSnapshot(aNew, bNew);

    const data = [newSnapshot, prevSnapshot];

    const res = await trap.shouldRespond(data);
    expect(res[0]).to.be.a('boolean');
    expect(res[1]).to.be.ok;
  });
});
