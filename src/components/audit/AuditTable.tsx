'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { AuditRecord, AuditFilter } from '@/audit/types';
import { AUDIT_STATUS_COLORS, AUDIT_STATUS_ICONS } from '@/audit/types';

interface Props {
    filter: AuditFilter;
    onRecordClick?: (record: AuditRecord) => void;
    refreshTrigger?: number;
}

export function AuditTable({ filter, onRecordClick, refreshTrigger }: Props) {
    const [records, setRecords] = useState<AuditRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);
    const observerRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);

    const PAGE_SIZE = 20;

    const fetchRecords = useCallback(async (currentOffset: number, append: boolean = false) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setIsLoading(true);

        try {
            const params = new URLSearchParams({
                limit: PAGE_SIZE.toString(),
                offset: currentOffset.toString(),
            });

            if (filter.status?.length) params.set('status', filter.status.join(','));
            if (filter.actionType?.length) params.set('actionType', filter.actionType.join(','));
            if (filter.source?.length) params.set('source', filter.source.join(','));
            if (filter.search) params.set('search', filter.search);
            if (filter.fromTimestamp) params.set('from', filter.fromTimestamp.toString());
            if (filter.toTimestamp) params.set('to', filter.toTimestamp.toString());

            const res = await fetch(`/api/audit?${params}`);
            const data = await res.json();

            if (data.success) {
                if (append) {
                    setRecords((prev) => [...prev, ...data.records]);
                } else {
                    setRecords(data.records);
                }
                setHasMore(data.hasMore);
                setTotal(data.total);
            }
        } catch (error) {
            console.error('Failed to fetch audit records:', error);
        } finally {
            setIsLoading(false);
            loadingRef.current = false;
        }
    }, [filter]);

    // Initial load and filter change
    useEffect(() => {
        setOffset(0);
        fetchRecords(0, false);
    }, [filter, refreshTrigger, fetchRecords]);

    // Auto-refresh every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (offset === 0) {
                fetchRecords(0, false);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchRecords, offset]);

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
                    const newOffset = offset + PAGE_SIZE;
                    setOffset(newOffset);
                    fetchRecords(newOffset, true);
                }
            },
            { threshold: 0.1 }
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, offset, fetchRecords]);

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const formatAmount = (record: AuditRecord) => {
        if (record.payload.amount) {
            const token = record.payload.token || 'USD';
            return `${record.payload.amount} ${token}`;
        }
        return '-';
    };

    const getStatusClass = (status: string) => {
        const color = AUDIT_STATUS_COLORS[status as keyof typeof AUDIT_STATUS_COLORS] || 'gray';
        return {
            green: 'text-green-400 bg-green-900/30',
            red: 'text-red-400 bg-red-900/30',
            yellow: 'text-yellow-400 bg-yellow-900/30',
            blue: 'text-blue-400 bg-blue-900/30',
            orange: 'text-orange-400 bg-orange-900/30',
        }[color] || 'text-gray-400 bg-gray-900/30';
    };

    return (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="text-sm text-muted">
                    {total} record{total !== 1 ? 's' : ''} total
                </div>
                <div className="flex items-center gap-2">
                    {isLoading && offset === 0 && (
                        <span className="text-xs text-muted animate-pulse">Refreshing...</span>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
                        <tr className="text-left text-muted">
                            <th className="px-4 py-3 font-medium">Time</th>
                            <th className="px-4 py-3 font-medium">Account</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Amount</th>
                            <th className="px-4 py-3 font-medium">Receipt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record) => (
                            <tr
                                key={record.id}
                                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                                onClick={() => onRecordClick?.(record)}
                            >
                                <td className="px-4 py-3 text-muted whitespace-nowrap">
                                    {formatTime(record.timestamp)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-medium">{record.account.name}</div>
                                    <div className="text-xs text-muted font-mono">
                                        {record.account.address.slice(0, 8)}...
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="capitalize">{record.actionType}</span>
                                    {record.payload.market && (
                                        <span className="text-muted ml-2">• {record.payload.market}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getStatusClass(record.status)}`}>
                                        {AUDIT_STATUS_ICONS[record.status]}
                                        {record.status}
                                    </span>
                                    {record.result.denials.length > 0 && (
                                        <div className="text-xs text-red-400 mt-1 truncate max-w-[200px]">
                                            {record.result.denials[0].reason}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                    {formatAmount(record)}
                                </td>
                                <td className="px-4 py-3">
                                    {record.txHash ? (
                                        <a
                                            href={`https://sepolia.arbiscan.io/tx/${record.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:underline font-mono text-xs"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {record.txHash.slice(0, 10)}...
                                        </a>
                                    ) : record.orderId ? (
                                        <span className="font-mono text-xs text-muted">
                                            {record.orderId}
                                        </span>
                                    ) : (
                                        <span className="text-muted">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {records.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                                    No audit records found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Infinite scroll trigger */}
            <div ref={observerRef} className="h-4" />

            {/* Loading indicator for pagination */}
            {isLoading && offset > 0 && (
                <div className="py-4 text-center text-muted text-sm animate-pulse">
                    Loading more...
                </div>
            )}

            {/* End of list */}
            {!hasMore && records.length > 0 && (
                <div className="py-4 text-center text-muted text-xs">
                    End of records
                </div>
            )}
        </div>
    );
}
