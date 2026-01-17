"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/status-badge"
import { TerminalOutput } from "@/components/terminal-output"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AuditLog {
  id: string
  timestamp: string
  action: "Buy" | "Sell"
  asset: string
  amount: string
  status: "confirmed" | "denied" | "pending"
  policyResult: string
  payload: string
}

const auditLogs: AuditLog[] = [
  {
    id: "1",
    timestamp: "2026-01-17 14:32:01",
    action: "Buy",
    asset: "ETH",
    amount: "$5,000",
    status: "confirmed",
    policyResult: "All checks passed",
    payload: `{
  "txHash": "0x1a2b...3c4d",
  "gasUsed": "21000",
  "gasPrice": "25 gwei",
  "policies": ["whitelist", "size_cap"],
  "result": "APPROVED"
}`,
  },
  {
    id: "2",
    timestamp: "2026-01-17 14:28:45",
    action: "Sell",
    asset: "BTC",
    amount: "$12,500",
    status: "denied",
    policyResult: "Exceeded max position size",
    payload: `{
  "requestedSize": "$12,500",
  "maxAllowed": "$10,000",
  "policy": "position_size_cap",
  "result": "DENIED"
}`,
  },
  {
    id: "3",
    timestamp: "2026-01-17 14:15:22",
    action: "Buy",
    asset: "SOL",
    amount: "$2,000",
    status: "pending",
    policyResult: "Awaiting confirmation",
    payload: `{
  "status": "PENDING",
  "estimatedGas": "45000",
  "policies": ["whitelist"],
  "queue_position": 3
}`,
  },
  {
    id: "4",
    timestamp: "2026-01-17 13:58:11",
    action: "Buy",
    asset: "LINK",
    amount: "$800",
    status: "confirmed",
    policyResult: "All checks passed",
    payload: `{
  "txHash": "0x5e6f...7g8h",
  "gasUsed": "21000",
  "gasPrice": "22 gwei",
  "policies": ["whitelist", "rate_limit"],
  "result": "APPROVED"
}`,
  },
  {
    id: "5",
    timestamp: "2026-01-17 13:45:00",
    action: "Sell",
    asset: "ETH",
    amount: "$3,200",
    status: "denied",
    policyResult: "Max drawdown threshold reached",
    payload: `{
  "currentDrawdown": "16.2%",
  "maxAllowed": "15%",
  "policy": "max_drawdown",
  "result": "DENIED"
}`,
  },
]

export default function AuditPage() {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredLogs = statusFilter === "all" ? auditLogs : auditLogs.filter((log) => log.status === statusFilter)

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" className="w-40 bg-card border-border/50 font-mono text-sm" defaultValue="2026-01-17" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" className="w-40 bg-card border-border/50 font-mono text-sm" defaultValue="2026-01-17" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-card border-border/50 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-40 bg-card border-border/50 text-sm">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-6">
        {/* Data Table */}
        <div className={cn("flex-1 rounded-xl border border-border/50 bg-card/30", selectedLog && "max-w-2xl")}>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-label">Timestamp</TableHead>
                <TableHead className="text-label">Action</TableHead>
                <TableHead className="text-label">Asset</TableHead>
                <TableHead className="text-label">Amount</TableHead>
                <TableHead className="text-label">Status</TableHead>
                <TableHead className="text-label">Policy Result</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className={cn(
                    "border-border/50 cursor-pointer transition-colors",
                    selectedLog?.id === log.id ? "bg-primary/5" : "hover:bg-white/5",
                  )}
                  onClick={() => setSelectedLog(log)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.timestamp}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-mono font-medium text-sm",
                        log.action === "Buy" ? "text-emerald-400" : "text-red-400",
                      )}
                    >
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono font-medium text-sm">{log.asset}</TableCell>
                  <TableCell className="font-mono text-sm">{log.amount}</TableCell>
                  <TableCell>
                    <StatusBadge variant={log.status}>
                      {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {log.policyResult}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Detail Panel */}
        {selectedLog && (
          <div className="w-96 rounded-xl border border-border/50 bg-card/30 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3>Transaction Details</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedLog(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-caption">Action</p>
                  <p
                    className={cn(
                      "font-mono font-medium text-sm",
                      selectedLog.action === "Buy" ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {selectedLog.action}
                  </p>
                </div>
                <div>
                  <p className="text-caption">Asset</p>
                  <p className="font-mono font-medium text-sm">{selectedLog.asset}</p>
                </div>
                <div>
                  <p className="text-caption">Amount</p>
                  <p className="font-mono font-medium text-sm">{selectedLog.amount}</p>
                </div>
                <div>
                  <p className="text-caption">Status</p>
                  <StatusBadge variant={selectedLog.status}>
                    {selectedLog.status.charAt(0).toUpperCase() + selectedLog.status.slice(1)}
                  </StatusBadge>
                </div>
              </div>

              <div>
                <p className="text-caption mb-2">Policy Breakdown</p>
                <p className="text-sm leading-relaxed">{selectedLog.policyResult}</p>
              </div>

              <div>
                <p className="text-caption mb-2">Raw Payload</p>
                <TerminalOutput content={selectedLog.payload} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
