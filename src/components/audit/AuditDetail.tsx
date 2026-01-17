'use client';

import type { AuditRecord } from '@/audit/types';
import { AUDIT_STATUS_ICONS, AUDIT_STATUS_COLORS } from '@/audit/types';

interface Props {
    record: AuditRecord;
    onClose: () => void;
}

export function AuditDetail({ record, onClose }: Props) {
    const formatTimestamp = (ts: number) => {
        return new Date(ts).toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const getStatusColor = () => {
        const color = AUDIT_STATUS_COLORS[record.status] || 'gray';
        return {
            green: 'bg-green-900/30 border-green-800 text-green-400',
            red: 'bg-red-900/30 border-red-800 text-red-400',
            yellow: 'bg-yellow-900/30 border-yellow-800 text-yellow-400',
            blue: 'bg-blue-900/30 border-blue-800 text-blue-400',
            orange: 'bg-orange-900/30 border-orange-800 text-orange-400',
        }[color] || 'bg-gray-900/30 border-gray-800 text-gray-400';
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-zinc-900 border-l border-zinc-800 z-50 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Audit Detail</h2>
                    <button
                        onClick={onClose}
                        className="text-muted hover:text-white transition-colors text-xl"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Status Badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusColor()}`}>
                        <span className="text-xl">{AUDIT_STATUS_ICONS[record.status]}</span>
                        <span className="font-medium capitalize">{record.status}</span>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-3">
                        <InfoRow label="ID" value={record.id} copyable />
                        <InfoRow label="Timestamp" value={formatTimestamp(record.timestamp)} />
                        <InfoRow label="Action Type" value={record.actionType} />
                        <InfoRow label="Category" value={record.actionCategory} />
                        <InfoRow label="Source" value={record.source} />
                    </div>

                    {/* Account */}
                    <Section title="Account">
                        <InfoRow label="Name" value={record.account.name} />
                        <InfoRow label="ID" value={record.account.id} copyable />
                        <InfoRow label="Address" value={record.account.address} copyable />
                    </Section>

                    {/* Payload */}
                    <Section title="Action Details">
                        {record.payload.market && <InfoRow label="Market" value={record.payload.market} />}
                        {record.payload.side && <InfoRow label="Side" value={record.payload.side} />}
                        {record.payload.amount && <InfoRow label="Amount" value={record.payload.amount.toString()} />}
                        {record.payload.price && <InfoRow label="Price" value={`$${record.payload.price}`} />}
                        {record.payload.leverage && <InfoRow label="Leverage" value={`${record.payload.leverage}x`} />}
                        {record.payload.to && <InfoRow label="To" value={record.payload.to} copyable />}
                        {record.payload.token && <InfoRow label="Token" value={record.payload.token} />}
                        {record.payload.strategy && <InfoRow label="Strategy" value={record.payload.strategy} />}
                        {record.payload.description && <InfoRow label="Description" value={record.payload.description} />}
                    </Section>

                    {/* Receipt */}
                    {(record.txHash || record.orderId) && (
                        <Section title="Receipt">
                            {record.txHash && (
                                <div className="space-y-2">
                                    <InfoRow label="TX Hash" value={record.txHash} copyable />
                                    <a
                                        href={`https://sepolia.arbiscan.io/tx/${record.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-blue-400 hover:underline text-sm"
                                    >
                                        View on Arbiscan ↗
                                    </a>
                                </div>
                            )}
                            {record.orderId && <InfoRow label="Order ID" value={record.orderId} copyable />}
                            {record.fillPrice && <InfoRow label="Fill Price" value={`$${record.fillPrice}`} />}
                            {record.fillAmount && <InfoRow label="Fill Amount" value={record.fillAmount.toString()} />}
                        </Section>
                    )}

                    {/* Gas Info */}
                    {(record.gasUsed || record.gasCost) && (
                        <Section title="Gas">
                            {record.gasUsed && <InfoRow label="Gas Used" value={record.gasUsed} />}
                            {record.gasCost && <InfoRow label="Gas Cost" value={record.gasCost} />}
                        </Section>
                    )}

                    {/* Denials */}
                    {record.result.denials.length > 0 && (
                        <Section title="Policy Denials">
                            <div className="space-y-3">
                                {record.result.denials.map((denial, i) => (
                                    <div
                                        key={i}
                                        className="bg-red-900/20 border border-red-800/50 rounded-lg p-3"
                                    >
                                        <div className="text-red-400 font-medium capitalize">
                                            {denial.guardian} Guardian
                                        </div>
                                        <div className="text-sm text-red-300 mt-1">
                                            {denial.reason}
                                        </div>
                                        {(denial.current || denial.limit) && (
                                            <div className="text-xs text-muted mt-2">
                                                {denial.current && <span>Current: {denial.current}</span>}
                                                {denial.current && denial.limit && <span> • </span>}
                                                {denial.limit && <span>Limit: {denial.limit}</span>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>
            </div>
        </>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-sm font-medium text-muted mb-3">{title}</h3>
            <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                {children}
            </div>
        </div>
    );
}

function InfoRow({
    label,
    value,
    copyable = false,
}: {
    label: string;
    value: string;
    copyable?: boolean;
}) {
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
    };

    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-muted text-sm">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-right break-all max-w-[250px]">
                    {value}
                </span>
                {copyable && (
                    <button
                        onClick={handleCopy}
                        className="text-muted hover:text-white transition-colors text-xs"
                        title="Copy to clipboard"
                    >
                        📋
                    </button>
                )}
            </div>
        </div>
    );
}
