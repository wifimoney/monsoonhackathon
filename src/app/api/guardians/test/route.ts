import { NextRequest, NextResponse } from 'next/server';
import { testGuardian } from '@/guardians/risk-engine';
import { recordEvent } from '@/guardians/state';
import type { GuardiansConfig } from '@/guardians/types';

export async function POST(request: NextRequest) {
    try {
        const { guardian } = await request.json() as { guardian: keyof GuardiansConfig };

        if (!guardian) {
            return NextResponse.json({ error: 'guardian required' }, { status: 400 });
        }

        const denial = testGuardian(guardian);

        // Record this test as an event
        recordEvent(
            'test',
            { amount: 500, market: `${guardian} test` },
            false,
            [denial]
        );

        return NextResponse.json({
            tested: guardian,
            denial,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
