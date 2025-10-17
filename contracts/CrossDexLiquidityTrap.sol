// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ITrap } from "./interfaces/ITrap.sol";
import { IUniswapV2Pair } from "./interfaces/IUniswapV2Pair.sol";

/// @notice Cross-DEX liquidity + price divergence trap compatible with Drosera ITrap
contract CrossDexLiquidityTrap is ITrap {
    // ===== CONFIG (edit for PoC/testing) =====
    // For PoC we set pair addresses as constants. In production these are provided by Drosera deployment.
    address public constant PAIR_A = address(0);
    address public constant PAIR_B = address(0);
    // Use canonical WETH as default base for clarity; change if needed for testing.
    address public constant BASE = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // thresholds in basis points (BPS)
    uint256 public constant DIVERGENCE_BPS = 2000; // 20%
    uint256 public constant LIQUIDITY_DRAIN_BPS = 3000; // 30%
    uint256 public constant MIN_RESERVE = 1000; // minimal reserve floor (token units)

    // ===== Helpers =====
    // Safe encode that guards against address(0) and non-contract addresses
    function _safeEncodePair(address pair) internal view returns (bytes memory out) {
        if (pair == address(0)) {
            return abi.encode(uint112(0), uint112(0), address(0), address(0), uint32(0));
        }
        uint256 size;
        assembly { size := extcodesize(pair) }
        if (size == 0) {
            return abi.encode(uint112(0), uint112(0), address(0), address(0), uint32(0));
        }
        try IUniswapV2Pair(pair).getReserves() returns (uint112 r0, uint112 r1, uint32 ts) {
            address t0 = IUniswapV2Pair(pair).token0();
            address t1 = IUniswapV2Pair(pair).token1();
            return abi.encode(r0, r1, t0, t1, ts);
        } catch {
            return abi.encode(uint112(0), uint112(0), address(0), address(0), uint32(0));
        }
    }

    function _decodePairData(bytes memory b) internal pure returns (uint256 r0, uint256 r1, address t0, address t1, uint32 ts) {
        (uint112 d0, uint112 d1, address a0, address a1, uint32 dts) = abi.decode(b, (uint112, uint112, address, address, uint32));
        return (uint256(d0), uint256(d1), a0, a1, dts);
    }

    function _liquidityDropBps(uint256 oldReserve, uint256 newReserve) internal pure returns (uint256) {
        if (oldReserve == 0) return type(uint256).max;
        if (newReserve >= oldReserve) return 0;
        uint256 drop = oldReserve - newReserve;
        return (drop * 10000) / oldReserve;
    }

    function _divergenceBps(uint256 priceA, uint256 priceB) internal pure returns (uint256) {
        if (priceA == 0 || priceB == 0) return type(uint256).max;
        if (priceA > priceB) {
            return ((priceA - priceB) * 10000) / priceB;
        } else {
            return ((priceB - priceA) * 10000) / priceA;
        }
    }

    function _priceNormalizedToBase(uint256 reserve0, uint256 reserve1, address token0, address token1) internal pure returns (uint256) {
        // price = quote / base scaled to 1e18
        if (token0 == BASE) {
            if (reserve0 == 0) return 0;
            return (reserve1 * 1e18) / reserve0;
        } else if (token1 == BASE) {
            if (reserve1 == 0) return 0;
            return (reserve0 * 1e18) / reserve1;
        } else {
            return 0;
        }
    }

    // ===== Drosera ITrap-compatible functions =====

    /// @notice collect() must be view and return abi-encoded bytes. Runner will store this (newest-first).
    function collect() external view override returns (bytes memory) {
        bytes memory a = _safeEncodePair(PAIR_A);
        bytes memory b = _safeEncodePair(PAIR_B);
        return abi.encode(a, b);
    }

    /// @notice shouldRespond(bytes[] calldata data) external pure returns (bool, bytes memory)
    /// data[0] = newest, data[1] = previous, ...
    function shouldRespond(bytes[] calldata data) external pure override returns (bool, bytes memory) {
        if (data.length < 2) return (false, bytes("insufficient-data"));

        bytes calldata newest = data[0];
        bytes calldata prev = data[1];

        (bytes memory aNewEnc, bytes memory bNewEnc) = abi.decode(newest, (bytes, bytes));
        (bytes memory aPrevEnc, bytes memory bPrevEnc) = abi.decode(prev, (bytes, bytes));

        (uint256 aNew_r0, uint256 aNew_r1, address aNew_t0, address aNew_t1, uint32 aNew_ts) = _decodePairData(aNewEnc);
        (uint256 aPrev_r0, uint256 aPrev_r1, , , uint32 aPrev_ts) = _decodePairData(aPrevEnc);

        (uint256 bNew_r0, uint256 bNew_r1, address bNew_t0, address bNew_t1, uint32 bNew_ts) = _decodePairData(bNewEnc);
        (uint256 bPrev_r0, uint256 bPrev_r1, , , uint32 bPrev_ts) = _decodePairData(bPrevEnc);

        // liquidity floors
        bool enoughA = (aNew_r0 >= MIN_RESERVE && aNew_r1 >= MIN_RESERVE);
        bool enoughB = (bNew_r0 >= MIN_RESERVE && bNew_r1 >= MIN_RESERVE);
        if (!enoughA || !enoughB) {
            return (false, bytes("low-liquidity"));
        }

        // liquidity drains (sum heuristic)
        uint256 drainA = _liquidityDropBps(aPrev_r0 + aPrev_r1, aNew_r0 + aNew_r1);
        uint256 drainB = _liquidityDropBps(bPrev_r0 + bPrev_r1, bNew_r0 + bNew_r1);
        bool significantDrain = (drainA >= LIQUIDITY_DRAIN_BPS) || (drainB >= LIQUIDITY_DRAIN_BPS);

        // normalized prices
        uint256 priceA = _priceNormalizedToBase(aNew_r0, aNew_r1, aNew_t0, aNew_t1);
        uint256 priceB = _priceNormalizedToBase(bNew_r0, bNew_r1, bNew_t0, bNew_t1);

        if (priceA == 0 || priceB == 0) {
            return (false, bytes("base-missing"));
        }

        uint256 divergence = _divergenceBps(priceA, priceB);
        bool significantDivergence = divergence >= DIVERGENCE_BPS;

        bool trigger = significantDrain && significantDivergence;

        bytes memory payload = abi.encode(
            trigger,
            priceA,
            priceB,
            divergence,
            drainA,
            drainB,
            aNew_r0,
            aNew_r1,
            bNew_r0,
            bNew_r1,
            aNew_ts,
            bNew_ts
        );

        return (trigger, payload);
    }
}
