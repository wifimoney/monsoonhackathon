'use client';

import { useState, useRef, useEffect } from 'react';

export interface TerminalLine {
    id: string;
    text: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'default';
    timestamp: Date;
}

interface TerminalOutputProps {
    lines: TerminalLine[];
    title?: string;
}

export function TerminalOutput({ lines, title = 'Terminal Output' }: TerminalOutputProps) {
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [lines]);

    return (
        <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--card-border)]">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-sm text-[var(--muted)] ml-2">{title}</span>
                </div>
                {lines.length > 0 && (
                    <span className="text-xs text-[var(--muted)]">
                        {lines.length} line{lines.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>
            <div ref={terminalRef} className="terminal rounded-none border-0 min-h-[300px]">
                {lines.length === 0 ? (
                    <div className="text-[var(--muted)] italic">Waiting for output...</div>
                ) : (
                    lines.map((line) => (
                        <div key={line.id} className={`terminal-line ${line.type}`}>
                            <span className="text-[var(--muted)] mr-2">
                                [{line.timestamp.toLocaleTimeString()}]
                            </span>
                            {line.text}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Hook to manage terminal lines
export function useTerminal() {
    const [lines, setLines] = useState<TerminalLine[]>([]);

    const addLine = (text: string, type: TerminalLine['type'] = 'default') => {
        setLines(prev => [...prev, {
            id: crypto.randomUUID(),
            text,
            type,
            timestamp: new Date(),
        }]);
    };

    const clear = () => setLines([]);

    return { lines, addLine, clear };
}
