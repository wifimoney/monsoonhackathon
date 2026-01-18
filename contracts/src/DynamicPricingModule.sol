// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title DynamicPricingModule
/// @notice Calculates bid/ask prices based on Oracle Mid Price + Inventory Skew
/// @dev Pure library to be used by MonsoonALM
library DynamicPricingModule {
    uint256 public constant BPS = 10000;
    uint256 public constant PRECISION = 1e18;

    struct Params {
        uint256 baseSpreadBps;     // Minimum spread (e.g., 10 = 0.1%)
        uint256 skewMultiplier;    // Impact of inventory imbalance (e.g., 50)
        uint256 targetRatioBps;    // Target ratio of reserve0/total (default 5000 = 50%)
    }

    /// @notice Get dynamic bid/ask prices
    /// @param midPrice Oracle mid price (scaled 1e18 ?? Check Quoter)
    /// @param reserve0 Current inventory of Token0
    /// @param reserve1 Current inventory of Token1
    /// @param params Pricing configuration
    /// @return bidPrice Price for ALM buying Token0 (User Selling)
    /// @return askPrice Price for ALM selling Token0 (User Buying)
    /// @return spreadBps The calculated spread
    function getPrices(
        uint256 midPrice,
        uint256 reserve0,
        uint256 reserve1,
        Params memory params
    ) internal pure returns (uint256 bidPrice, uint256 askPrice, uint256 spreadBps) {
        uint256 totalLiquidity = reserve0 + reserve1; // Simplified: assumes prices distinct or stable-ish for ratio
        
        // Calculate skew: deviation from target ratio
        // If we have TOO MUCH Token0, we want to Buy Lower (lower Bid) and Sell Lower (lower Ask)
        // Actually, typical MM logic:
        // High Inventory -> Lower Price to encourage selling, discourage buying.
        
        // Let's use simple symmetric spread widening based on imbalance magnitude + shift.
        
        // Calculate spread
        uint256 skew = 0;
        if (totalLiquidity > 0) {
            // Check ratio. Warning: summing raw amounts is crude if decimals differ or price != 1.
            // Ideally: value-based skew.
            // For hackathon MVP: assumes Token0/Token1 are similar value (stable pair) OR just use simple imbalance.
            // Let's improve: Value-based skew using midPrice.
            
            uint256 val0 = reserve0 * midPrice / PRECISION;
            uint256 val1 = reserve1; 
            uint256 totalVal = val0 + val1;
            
            if (totalVal > 0) {
                // Target: 50/50 value
                uint256 currentRatio = (val0 * 10000) / totalVal;
                uint256 target = params.targetRatioBps; // 5000 default
                
                if (currentRatio > target) {
                    skew = currentRatio - target;
                } else {
                    skew = target - currentRatio;
                }
            }
        }
        
        // Spread = Base + (Multiplier * Skew / 10000)
        // E.g. Skew = 10% (1000 bps). Multiplier = 10. Spread += 10 * 1000 / 10000 = 1 bps.
        // Let's scale multiplier higher in config.
        uint256 dynamicPart = (params.skewMultiplier * skew) / 10000;
        spreadBps = params.baseSpreadBps + dynamicPart;
        
        // Calculate prices
        // Bid = Mid * (1 - Spread)
        bidPrice = (midPrice * (BPS - spreadBps)) / BPS;
        
        // Ask = Mid * (1 + Spread)
        askPrice = (midPrice * (BPS + spreadBps)) / BPS;
    }
}
