import { NextRequest, NextResponse } from 'next/server';
import {
    getGuardiansConfig,
    setGuardiansConfig,
    applyPreset,
    setGuardianEnabled,
    simulateDrawdownBreach,
    simulateOutsideHours,
    resumeTrading,
} from '@/guardians/state';
import type { GuardiansConfig, GuardianPreset } from '@/guardians/types';

export async function GET() {
    try {
        const config = getGuardiansConfig();
        return NextResponse.json(config);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Apply preset
        if (body.preset) {
            applyPreset(body.preset as GuardianPreset);
            return NextResponse.json({ success: true, preset: body.preset });
        }

        // Toggle guardian
        if (body.toggle) {
            setGuardianEnabled(body.toggle.guardian, body.toggle.enabled);
            return NextResponse.json({ success: true });
        }

        // Simulate drawdown breach
        if (body.simulateDrawdown !== undefined) {
            simulateDrawdownBreach(body.simulateDrawdown);
            return NextResponse.json({ success: true, halted: body.simulateDrawdown });
        }

        // Simulate outside hours
        if (body.simulateOutsideHours !== undefined) {
            simulateOutsideHours(body.simulateOutsideHours);
            return NextResponse.json({ success: true });
        }

        // Resume trading (reset halt)
        if (body.resumeTrading) {
            resumeTrading();
            return NextResponse.json({ success: true, halted: false });
        }

        // Full config update
        if (body.config) {
            setGuardiansConfig(body.config as Partial<GuardiansConfig>);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
