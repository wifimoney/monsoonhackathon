import { NextResponse } from 'next/server';
import { getAction, approveAction, rejectAction } from '@/approvals/store';

interface Params {
    params: Promise<{ id: string }>;
}

// GET - Get single action details
export async function GET(request: Request, { params }: Params) {
    const { id } = await params;
    const action = getAction(id);

    if (!action) {
        return NextResponse.json(
            { success: false, error: 'Action not found' },
            { status: 404 }
        );
    }

    return NextResponse.json({ success: true, action });
}

// POST - Approve or reject action
export async function POST(request: Request, { params }: Params) {
    const { id } = await params;

    try {
        const body = await request.json();
        const { action: decision } = body;

        if (!decision || !['approve', 'reject'].includes(decision)) {
            return NextResponse.json(
                { success: false, error: 'Invalid decision. Use "approve" or "reject"' },
                { status: 400 }
            );
        }

        const existingAction = getAction(id);
        if (!existingAction) {
            return NextResponse.json(
                { success: false, error: 'Action not found' },
                { status: 404 }
            );
        }

        if (existingAction.status !== 'pending') {
            return NextResponse.json(
                { success: false, error: `Action already ${existingAction.status}` },
                { status: 400 }
            );
        }

        let result;
        if (decision === 'approve') {
            result = approveAction(id);
        } else {
            result = rejectAction(id);
        }

        return NextResponse.json({
            success: true,
            action: result,
            message: decision === 'approve'
                ? (result?.policyCheck.passed ? '✅ Action approved and executed' : '❌ Action rejected by policy')
                : '❌ Action rejected by user',
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Invalid request' },
            { status: 400 }
        );
    }
}

// DELETE - Cancel pending action (same as reject)
export async function DELETE(request: Request, { params }: Params) {
    const { id } = await params;
    const result = rejectAction(id);

    if (!result) {
        return NextResponse.json(
            { success: false, error: 'Action not found' },
            { status: 404 }
        );
    }

    return NextResponse.json({
        success: true,
        action: result,
        message: 'Action cancelled',
    });
}
