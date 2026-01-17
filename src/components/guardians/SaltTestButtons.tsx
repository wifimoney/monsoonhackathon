'use client';

import { useState } from 'react';

interface TestResult {
    success: boolean;
    message: string;
    txHash?: string;
    explorerUrl?: string;
    logs?: string[];
}

interface Props {
    onTestComplete?: () => void;
}

export function SaltTestButtons({ onTestComplete }: Props) {
    const [isTestingAllowed, setIsTestingAllowed] = useState(false);
    const [isTestingDeniedRecipient, setIsTestingDeniedRecipient] = useState(false);
    const [isTestingDeniedAmount, setIsTestingDeniedAmount] = useState(false);
    const [lastResult, setLastResult] = useState<TestResult | null>(null);
    const [showLogs, setShowLogs] = useState(false);

    const runTest = async (
        endpoint: string,
        setLoading: (v: boolean) => void,
        body?: object
    ) => {
        setLoading(true);
        setLastResult(null);
        setShowLogs(false);

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
            });
            const data = await res.json();

            setLastResult({
                success: data.success,
                message: data.message,
                txHash: data.txHash,
                explorerUrl: data.explorerUrl,
                logs: data.logs,
            });

            onTestComplete?.();
        } catch (error) {
            setLastResult({
                success: false,
                message: 'Test failed - check console',
            });
        } finally {
            setLoading(false);
        }
    };

    const isAnyTesting = isTestingAllowed || isTestingDeniedRecipient || isTestingDeniedAmount;

    return (
        <div className="card p-4 space-y-4">
            <div>
                <h3 className="text-sm font-medium text-muted mb-1">Salt Integration Tests</h3>
                <p className="text-xs text-muted">
                    Execute real transactions on Arbitrum Sepolia
                </p>
            </div>

            <div className="space-y-3">
                {/* Test: Allowed Transaction */}
                <button
                    onClick={() => runTest('/api/guardians/test/salt-allowed', setIsTestingAllowed)}
                    disabled={isAnyTesting}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 
                               disabled:cursor-not-allowed text-white font-medium py-3 px-4 
                               rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {isTestingAllowed ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            Executing Salt Transfer...
                        </>
                    ) : (
                        <>
                            ✅ Test Allowed Transfer
                            <span className="text-green-300 text-xs">(0.0001 ETH to allowlist)</span>
                        </>
                    )}
                </button>

                {/* Test: Denied - Bad Recipient */}
                <button
                    onClick={() => runTest(
                        '/api/guardians/test/salt-denied',
                        setIsTestingDeniedRecipient,
                        { reason: 'recipient' }
                    )}
                    disabled={isAnyTesting}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 
                               disabled:cursor-not-allowed text-white font-medium py-3 px-4 
                               rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {isTestingDeniedRecipient ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            Testing Policy...
                        </>
                    ) : (
                        <>
                            🚫 Test Denied (Bad Recipient)
                            <span className="text-red-300 text-xs">(0xdead... not allowed)</span>
                        </>
                    )}
                </button>

                {/* Test: Denied - Over Amount */}
                <button
                    onClick={() => runTest(
                        '/api/guardians/test/salt-denied',
                        setIsTestingDeniedAmount,
                        { reason: 'amount' }
                    )}
                    disabled={isAnyTesting}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-700 
                               disabled:cursor-not-allowed text-white font-medium py-3 px-4 
                               rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {isTestingDeniedAmount ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            Testing Policy...
                        </>
                    ) : (
                        <>
                            🚫 Test Denied (Over Limit)
                            <span className="text-orange-300 text-xs">(1000 ETH &gt; limit)</span>
                        </>
                    )}
                </button>
            </div>

            {/* Result display */}
            {lastResult && (
                <div className={`
                    p-3 rounded-lg border space-y-2
                    ${lastResult.success
                        ? 'bg-green-900/20 border-green-800'
                        : 'bg-red-900/20 border-red-800'
                    }
                `}>
                    <p className={`text-sm font-medium ${lastResult.success ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {lastResult.message}
                    </p>

                    {lastResult.txHash && (
                        <a
                            href={lastResult.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 text-xs hover:underline font-mono"
                        >
                            {lastResult.txHash.slice(0, 16)}... ↗
                        </a>
                    )}

                    {lastResult.logs && lastResult.logs.length > 0 && (
                        <div>
                            <button
                                onClick={() => setShowLogs(!showLogs)}
                                className="text-xs text-muted hover:text-white"
                            >
                                {showLogs ? '▼ Hide logs' : '▶ Show logs'}
                            </button>
                            {showLogs && (
                                <pre className="mt-2 text-xs text-muted bg-black/30 p-2 rounded overflow-x-auto max-h-40">
                                    {lastResult.logs.join('\n')}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Info */}
            <div className="text-xs text-muted pt-2 border-t border-zinc-800">
                <p>
                    💡 These tests execute <strong>real</strong> Salt transactions.
                    Make sure your account has testnet ETH.
                </p>
            </div>
        </div>
    );
}
