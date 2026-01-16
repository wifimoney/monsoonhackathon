'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { SaltConnection } from '@/components/salt/SaltConnection';
import { GuardrailsConfig } from '@/components/salt/GuardrailsConfig';
import { ActionExecutor } from '@/components/salt/ActionExecutor';

export default function GuardrailsPage() {
    const { isConnected: walletConnected } = useAccount();
    const [saltAccountId, setSaltAccountId] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Guardrails</h2>
                <p className="text-[var(--muted)] mt-1">
                    Salt-powered policy enforcement for safe automation
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Step 1: Connect Salt */}
                    <section>
                        <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
                            1. Connect Salt Account
                        </h3>
                        <SaltConnection
                            onConnected={(account) => setSaltAccountId(account.id)}
                        />
                    </section>

                    {/* Step 2: Configure Guardrails */}
                    <section>
                        <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
                            2. Configure Policy
                        </h3>
                        <GuardrailsConfig />
                    </section>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Step 3: Test Execution */}
                    <section>
                        <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
                            3. Test Execution
                        </h3>
                        <ActionExecutor accountId={saltAccountId || undefined} />
                    </section>

                    {/* Info Box */}
                    <div className="card bg-[var(--primary)]/5 border-[var(--primary)]/30">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">🛡️</span>
                            <div>
                                <h4 className="font-semibold text-white mb-2">How it works</h4>
                                <p className="text-[var(--muted)] text-sm leading-relaxed">
                                    Salt acts as the final gatekeeper. Agents can propose actions,
                                    but Salt will only execute if they comply with your policy.
                                    Try the <span className="text-[var(--danger)]">"Forbidden Action"</span> to see a denial.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Demo Flow */}
                    <div className="card">
                        <h4 className="font-semibold text-white mb-3">Demo Flow</h4>
                        <ol className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="bg-[var(--primary)] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0">1</span>
                                <span className="text-[var(--muted)]">Click <strong className="text-white">"Connect Salt"</strong> to authenticate</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-[var(--primary)] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0">2</span>
                                <span className="text-[var(--muted)]">Enable <strong className="text-white">Monsoon Guardrails</strong> toggle</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-[var(--accent)] text-black w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0">✓</span>
                                <span className="text-[var(--muted)]"><strong className="text-[var(--accent)]">"Run Allowed Action"</strong> → Transaction executes</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-[var(--danger)] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0">✕</span>
                                <span className="text-[var(--muted)]"><strong className="text-[var(--danger)]">"Try Forbidden Action"</strong> → Blocked by policy</span>
                            </li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}
