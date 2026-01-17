import { NextResponse } from 'next/server';
import { checkStrategyEligibility, type MarketData } from '@/guardians/risk-engine';
import { getGuardiansConfig, applyPreset } from '@/guardians/state';
import { GUARDIAN_PRESETS, type GuardianPreset, type StrategyPresetType } from '@/guardians/types';

// Mock market data for demo
function getMockMarketData(strategy: StrategyPresetType): MarketData {
    switch (strategy) {
        case 'basisArb':
            // Simulate good funding conditions
            return {
                fundingRate: 0.0002, // 0.02% - above 0.01% threshold
                basisSpread: 0.003,  // 0.3% - within 0.5% limit
            };
        case 'autoHedge':
            // Simulate delta drift
            return {
                delta: 75, // $75 drift - above $50 threshold
            };
        case 'marketHours':
            return {};
        case 'drawdownStop':
            return {
                pnl: -50, // -$50 loss - within $100 limit
            };
        default:
            return {};
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const strategy = searchParams.get('strategy') as StrategyPresetType;
    const simulateFail = searchParams.get('fail') === 'true';

    if (!strategy || !['basisArb', 'autoHedge', 'marketHours', 'drawdownStop'].includes(strategy)) {
        return NextResponse.json(
            { error: 'Invalid strategy. Use: basisArb, autoHedge, marketHours, drawdownStop' },
            { status: 400 }
        );
    }

    // Apply the strategy preset
    if (strategy in GUARDIAN_PRESETS) {
        applyPreset(strategy as GuardianPreset);
    }

    const config = getGuardiansConfig();
    let marketData = getMockMarketData(strategy);

    // Simulate failing conditions for demo
    if (simulateFail) {
        switch (strategy) {
            case 'basisArb':
                marketData = { fundingRate: 0.00005, basisSpread: 0.01 }; // Too low funding
                break;
            case 'autoHedge':
                marketData = { delta: 20 }; // Below threshold
                break;
            case 'drawdownStop':
                // Simulate paused account
                if (config.strategy) {
                    config.strategy.accountStatus = 'paused';
                }
                break;
        }
    }

    const result = checkStrategyEligibility(strategy, config, marketData, 50);

    return NextResponse.json({
        success: true,
        strategy,
        eligible: result.eligible,
        message: result.message,
        denials: result.denials,
        config: {
            spend: config.spend,
            leverage: config.leverage,
            exposure: config.exposure,
            strategy: config.strategy,
        },
        marketData,
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { strategy, marketData, hedgeSize } = body;

        if (!strategy || !['basisArb', 'autoHedge', 'marketHours', 'drawdownStop'].includes(strategy)) {
            return NextResponse.json(
                { error: 'Invalid strategy' },
                { status: 400 }
            );
        }

        // Apply preset
        if (strategy in GUARDIAN_PRESETS) {
            applyPreset(strategy as GuardianPreset);
        }

        const config = getGuardiansConfig();
        const result = checkStrategyEligibility(
            strategy,
            config,
            marketData || getMockMarketData(strategy),
            hedgeSize || 50
        );

        return NextResponse.json({
            success: true,
            ...result,
            config: {
                spend: config.spend,
                leverage: config.leverage,
                strategy: config.strategy,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
