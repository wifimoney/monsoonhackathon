"use client"

import { useState, useEffect } from "react"
import { StatusBadge } from "@/components/status-badge"
import { TerminalOutput } from "@/components/terminal-output"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronRight, X, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AuditRecord, AuditStatus } from "@/audit/types"

interface AuditStats {
  totalActions: number
  confirmed: number
  pending: number
  denied: number
  approved: number
}

export default function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAuditRecords = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (actionFilter !== "all") params.set("actionType", actionFilter)

      const res = await fetch(`/api/audit?${params}`)
      const data = await res.json()

      if (data.success) {
        setRecords(data.records)
        setStats(data.stats)
      } else {
        setError(data.error || "Failed to fetch audit records")
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditRecords()
  }, [statusFilter, actionFilter])

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString()
  }

  const getActionColor = (actionType: string) => {
    if (actionType.includes('deposit') || actionType === 'trade') return 'text-emerald-400'
    if (actionType.includes('withdraw') || actionType === 'sell') return 'text-red-400'
    return 'text-blue-400'
  }

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border/50 bg-card/50">
            <p className="text-caption text-xs">Total Actions</p>
            <p className="text-2xl font-bold font-mono">{stats.totalActions}</p>
          </div>
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <p className="text-caption text-xs">Approved</p>
            <p className="text-2xl font-bold font-mono text-emerald-400">{stats.approved + stats.confirmed}</p>
          </div>
          <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
            <p className="text-caption text-xs">Pending</p>
            <p className="text-2xl font-bold font-mono text-yellow-400">{stats.pending}</p>
          </div>
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
            <p className="text-caption text-xs">Denied</p>
            <p className="text-2xl font-bold font-mono text-red-400">{stats.denied}</p>
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-card border-border/50 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40 bg-card border-border/50 text-sm">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="withdraw">Withdraw</SelectItem>
            <SelectItem value="trade">Trade</SelectItem>
            <SelectItem value="approval">Approval</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchAuditRecords} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-6">
        {/* Data Table */}
        <div className={cn("flex-1 rounded-xl border border-border/50 bg-card/30", selectedRecord && "max-w-2xl")}>
          {records.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No audit records found. Actions will appear here as they are executed.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-label">Timestamp</TableHead>
                  <TableHead className="text-label">Action</TableHead>
                  <TableHead className="text-label">Category</TableHead>
                  <TableHead className="text-label">Status</TableHead>
                  <TableHead className="text-label">Source</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow
                    key={record.id}
                    className={cn(
                      "border-border/50 cursor-pointer transition-colors",
                      selectedRecord?.id === record.id ? "bg-primary/5" : "hover:bg-white/5",
                    )}
                    onClick={() => setSelectedRecord(record)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatTimestamp(record.timestamp)}
                    </TableCell>
                    <TableCell>
                      <span className={cn("font-mono font-medium text-sm", getActionColor(record.actionType))}>
                        {record.actionType}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {record.actionCategory}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={record.status as any}>
                        {record.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.source}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Detail Panel */}
        {selectedRecord && (
          <div className="w-96 rounded-xl border border-border/50 bg-card/30 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3>Record Details</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRecord(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-caption">Action Type</p>
                  <p className={cn("font-mono font-medium text-sm", getActionColor(selectedRecord.actionType))}>
                    {selectedRecord.actionType}
                  </p>
                </div>
                <div>
                  <p className="text-caption">Category</p>
                  <p className="font-mono font-medium text-sm">{selectedRecord.actionCategory}</p>
                </div>
                <div>
                  <p className="text-caption">Status</p>
                  <StatusBadge variant={selectedRecord.status as any}>
                    {selectedRecord.status}
                  </StatusBadge>
                </div>
                <div>
                  <p className="text-caption">Source</p>
                  <p className="font-mono font-medium text-sm">{selectedRecord.source}</p>
                </div>
              </div>

              <div>
                <p className="text-caption mb-1">Account</p>
                <p className="text-sm font-mono">{selectedRecord.account.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{selectedRecord.account.address}</p>
              </div>

              {selectedRecord.txHash && (
                <div>
                  <p className="text-caption mb-1">TX Hash</p>
                  <p className="text-sm font-mono text-primary truncate">{selectedRecord.txHash}</p>
                </div>
              )}

              {!selectedRecord.result.passed && selectedRecord.result.denials.length > 0 && (
                <div>
                  <p className="text-caption mb-2">Policy Denials</p>
                  <div className="space-y-1">
                    {selectedRecord.result.denials.map((d, i) => (
                      <div key={i} className="text-sm text-red-400">
                        {d.name}: {d.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-caption mb-2">Payload</p>
                <TerminalOutput content={JSON.stringify(selectedRecord.payload, null, 2)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
