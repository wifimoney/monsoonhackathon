import { NextRequest, NextResponse } from 'next/server';
import { testGuardian } from '@/guardians/risk-engine';
import type { GuardiansConfig } from '@/guardians/types';

export async function POST(request: NextRequest) {
    try {
        const { guardian } = await request.json() as { guardian: keyof GuardiansConfig };

        if (!guardian) {
            return NextResponse.json({ error: 'guardian required' }, { status: 400 });
        }

        const denial = testGuardian(guardian);

        return NextResponse.json({
            tested: guardian,
            denial,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
