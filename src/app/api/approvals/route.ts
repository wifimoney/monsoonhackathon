import { NextResponse } from 'next/server';
import { getPendingActions, proposeAction, proposeDemoActions, getPendingCount } from '@/approvals/store';
import type { ProposeActionRequest } from '@/approvals/types';

// GET - List all pending actions
export async function GET() {
    const actions = getPendingActions();
    const pendingCount = getPendingCount();

    return NextResponse.json({
        success: true,
        actions,
        pendingCount,
        total: actions.length,
    });
}

// POST - Propose a new action
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Demo mode: create demo actions
        if (body.demo) {
            const demoActions = proposeDemoActions();
            return NextResponse.json({
                success: true,
                actions: demoActions,
                message: 'Demo actions created',
            });
        }

        const { type, details, proposedBy } = body as ProposeActionRequest;

        if (!type) {
            return NextResponse.json(
                { success: false, error: 'Action type required' },
                { status: 400 }
            );
        }

        const action = proposeAction({ type, details: details || {}, proposedBy });

        return NextResponse.json({
            success: true,
            action,
            message: action.policyCheck.passed
                ? 'Action proposed - awaiting approval'
                : 'Action proposed but blocked by policy',
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Invalid request' },
            { status: 400 }
        );
    }
}
