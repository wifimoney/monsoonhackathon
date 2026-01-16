export type TxStage =
    | 'proposed'
    | 'policy_check'
    | 'signing'
    | 'broadcasting'
    | 'confirmed'
    | 'failed'
    | 'denied';

// Map Salt SDK states to UI stages
export function mapSaltState(state: string): TxStage {
    const s = state.toUpperCase();

    if (s.includes('PROPOSED') || s.includes('IDLE')) return 'proposed';
    if (s.includes('POLICY')) return 'policy_check';
    if (s.includes('SIGN') || s.includes('PENDING')) return 'signing';
    if (s.includes('BROADCAST') || s.includes('COMBINE')) return 'broadcasting';
    if (s.includes('CONFIRM') || s.includes('SUCCESS') || s.includes('END')) return 'confirmed';
    if (s.includes('REJECT') || s.includes('BREACH') || s.includes('DENIED')) return 'denied';
    if (s.includes('FAIL') || s.includes('ERROR')) return 'failed';

    return 'proposed';
}

export const STAGE_LABELS: Record<TxStage, string> = {
    proposed: 'Proposed',
    policy_check: 'Checking policies...',
    signing: 'Collecting signatures...',
    broadcasting: 'Broadcasting...',
    confirmed: 'Confirmed ✓',
    failed: 'Failed',
    denied: 'Blocked by policy',
};

export const STAGE_COLORS: Record<TxStage, string> = {
    proposed: 'bg-blue-600',
    policy_check: 'bg-yellow-600',
    signing: 'bg-purple-600',
    broadcasting: 'bg-indigo-600',
    confirmed: 'bg-green-600',
    failed: 'bg-yellow-600',
    denied: 'bg-red-600',
};
