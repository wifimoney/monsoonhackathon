'use client';

import { useState } from 'react';
import type { AuditFilter, AuditStatus } from '@/audit/types';

interface Props {
    filter: AuditFilter;
    onFilterChange: (filter: AuditFilter) => void;
    onExport: () => void;
}

const STATUS_OPTIONS: { value: AuditStatus; label: string }[] = [
    { value: 'approved', label: '✅ Approved' },
    { value: 'denied', label: '🚫 Denied' },
    { value: 'pending', label: '⏳ Pending' },
    { value: 'filled', label: '✅ Filled' },
    { value: 'partial', label: '📊 Partial' },
    { value: 'failed', label: '❌ Failed' },
];

const ACTION_TYPE_OPTIONS = [
    { value: 'trade', label: 'Trade' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'swap', label: 'Swap' },
    { value: 'stake', label: 'Stake' },
    { value: 'order', label: 'Order' },
    { value: 'test', label: 'Test' },
];

const TIME_RANGE_OPTIONS = [
    { value: 'all', label: 'All Time' },
    { value: '24h', label: 'Last 24h' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
];

export function AuditFilters({ filter, onFilterChange, onExport }: Props) {
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isTypeOpen, setIsTypeOpen] = useState(false);
    const [timeRange, setTimeRange] = useState('all');
    const [searchValue, setSearchValue] = useState('');

    const handleStatusToggle = (status: AuditStatus) => {
        const current = filter.status || [];
        const updated = current.includes(status)
            ? current.filter((s) => s !== status)
            : [...current, status];
        onFilterChange({ ...filter, status: updated.length ? updated : undefined });
    };

    const handleTypeToggle = (type: string) => {
        const current = (filter.actionType || []) as string[];
        const updated = current.includes(type)
            ? current.filter((t) => t !== type)
            : [...current, type];
        onFilterChange({
            ...filter,
            actionType: updated.length ? (updated as AuditFilter['actionType']) : undefined,
        });
    };

    const handleTimeRangeChange = (range: string) => {
        setTimeRange(range);
        const now = Date.now();
        let fromTimestamp: number | undefined;

        switch (range) {
            case '24h':
                fromTimestamp = now - 24 * 60 * 60 * 1000;
                break;
            case '7d':
                fromTimestamp = now - 7 * 24 * 60 * 60 * 1000;
                break;
            case '30d':
                fromTimestamp = now - 30 * 24 * 60 * 60 * 1000;
                break;
            default:
                fromTimestamp = undefined;
        }

        onFilterChange({
            ...filter,
            fromTimestamp,
            toTimestamp: undefined,
        });
    };

    const handleSearch = (value: string) => {
        setSearchValue(value);
        onFilterChange({
            ...filter,
            search: value || undefined,
        });
    };

    const clearFilters = () => {
        setTimeRange('all');
        setSearchValue('');
        onFilterChange({});
    };

    const hasActiveFilters =
        (filter.status?.length ?? 0) > 0 ||
        (filter.actionType?.length ?? 0) > 0 ||
        filter.fromTimestamp ||
        filter.search;

    return (
        <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Time Range */}
            <select
                value={timeRange}
                onChange={(e) => handleTimeRangeChange(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                {TIME_RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            {/* Status Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setIsStatusOpen(!isStatusOpen)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm flex items-center gap-2 hover:bg-zinc-700 transition-colors"
                >
                    Status
                    {filter.status?.length ? (
                        <span className="bg-blue-600 text-xs px-1.5 py-0.5 rounded-full">
                            {filter.status.length}
                        </span>
                    ) : null}
                    <span className="text-muted">▼</span>
                </button>

                {isStatusOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2 z-10 min-w-[160px] shadow-lg">
                        {STATUS_OPTIONS.map((opt) => (
                            <label
                                key={opt.value}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-700 rounded cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={filter.status?.includes(opt.value) || false}
                                    onChange={() => handleStatusToggle(opt.value)}
                                    className="rounded"
                                />
                                <span className="text-sm">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Type Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setIsTypeOpen(!isTypeOpen)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm flex items-center gap-2 hover:bg-zinc-700 transition-colors"
                >
                    Type
                    {filter.actionType?.length ? (
                        <span className="bg-blue-600 text-xs px-1.5 py-0.5 rounded-full">
                            {filter.actionType.length}
                        </span>
                    ) : null}
                    <span className="text-muted">▼</span>
                </button>

                {isTypeOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2 z-10 min-w-[140px] shadow-lg">
                        {ACTION_TYPE_OPTIONS.map((opt) => (
                            <label
                                key={opt.value}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-700 rounded cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={filter.actionType?.includes(opt.value as never) || false}
                                    onChange={() => handleTypeToggle(opt.value)}
                                    className="rounded"
                                />
                                <span className="text-sm">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
                <input
                    type="text"
                    placeholder="Search by tx hash, order ID..."
                    value={searchValue}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <button
                    onClick={clearFilters}
                    className="text-sm text-muted hover:text-white transition-colors"
                >
                    Clear
                </button>
            )}

            {/* Export Button */}
            <button
                onClick={onExport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
                📥 Export CSV
            </button>

            {/* Click outside handler */}
            {(isStatusOpen || isTypeOpen) && (
                <div
                    className="fixed inset-0 z-[5]"
                    onClick={() => {
                        setIsStatusOpen(false);
                        setIsTypeOpen(false);
                    }}
                />
            )}
        </div>
    );
}
