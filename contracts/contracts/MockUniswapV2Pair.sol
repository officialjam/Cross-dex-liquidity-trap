// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockUniswapV2Pair {
    uint112 private _r0;
    uint112 private _r1;
    address private _t0;
    address private _t1;

    constructor(address t0, address t1, uint112 r0, uint112 r1) {
        _t0 = t0;
        _t1 = t1;
        _r0 = r0;
        _r1 = r1;
    }

    function token0() external view returns (address) { return _t0; }
    function token1() external view returns (address) { return _t1; }
    function getReserves() external view returns (uint112, uint112, uint32) {
        return (_r0, _r1, uint32(block.timestamp));
    }
}
