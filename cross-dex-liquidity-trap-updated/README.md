# Cross-DEX Liquidity Trap — Updated (Drosera ITrap compatible)

This project is a PoC **Cross-DEX liquidity drain + price divergence trap** updated to match Drosera's ITrap interface and Hoodi expectations.

## What was fixed / implemented
- `collect()` is `external view returns (bytes memory)` and reads pair reserves (UniswapV2-like) and encodes snapshots.
- `shouldRespond(bytes[] calldata)` is `external pure returns (bool, bytes memory)` and treats `data[0]` as newest (Drosera ordering).
- Uses **BPS** thresholds (10_000 = 100%) and a **liquidity floor** to avoid dust pools.
- Normalizes price orientation to a BASE token so prices are comparable across pairs.
- Returns a structured `payload` alongside boolean trigger for the responder.

## How to use locally
1. Edit `contracts/CrossDexLiquidityTrap.sol` and set `PAIR_A`, `PAIR_B`, and `BASE` addresses for your test environment (Hoodi or local fork). For PoC they are constants to keep the contract stateless as reviewers requested.
2. Install deps:
```bash
npm install
```

3. Run tests:
```bash
npx hardhat test
```

4. To deploy locally (Hardhat node):
```bash
npx hardhat node
# in another terminal
npx hardhat run scripts/deploy-local.js --network localhost
```

## Testing in Hoodi
- Hoodi runs the Drosera runner flow. After deploying the trap in your Hoodi environment (or pointing Hoodi to this contract address), Hoodi will call `collect()` periodically and feed stored snapshots (newest-first) into `shouldRespond()` for evaluation.

## Notes
- This is a PoC. Pair & base addresses are constants in the contract for statelessness (no constructor). Edit them before deploying to real networks or during testing in Hoodi.
- The contract returns diagnostic short strings for easy debugging (`low-liquidity`, `base-missing`, etc.) inside the payload bytes when appropriate.
