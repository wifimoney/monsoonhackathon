"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User, TrendingUp, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "agent"
  content: string
  tradePreview?: {
    market: string
    side: "Buy" | "Sell"
    size: string
    riskLevel: "Low" | "Medium" | "High"
  }
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "agent",
    content:
      "Welcome to Monsoon Agent. I can help you execute trades, analyze markets, and manage your positions. What would you like to do?",
  },
  {
    id: "2",
    role: "user",
    content: "Buy $1000 ETH",
  },
  {
    id: "3",
    role: "agent",
    content: "I've prepared a trade for you. Here's the preview:",
    tradePreview: {
      market: "ETH/USDC",
      side: "Buy",
      size: "$1,000.00",
      riskLevel: "Low",
    },
  },
]

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim()) return
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }
    setMessages([...messages, newMessage])
    setInput("")
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Chat Window */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
            {message.role === "agent" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={cn(
                "max-w-xl rounded-2xl px-4 py-3",
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border/50",
              )}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>

              {/* Trade Preview Card */}
              {message.tradePreview && (
                <div className="mt-3 rounded-xl border border-border/50 bg-black/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-label">Trade Preview</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-caption">Market</p>
                      <p className="font-mono font-medium text-sm">{message.tradePreview.market}</p>
                    </div>
                    <div>
                      <p className="text-caption">Side</p>
                      <p
                        className={cn(
                          "font-mono font-medium text-sm",
                          message.tradePreview.side === "Buy" ? "text-emerald-400" : "text-red-400",
                        )}
                      >
                        {message.tradePreview.side}
                      </p>
                    </div>
                    <div>
                      <p className="text-caption">Size</p>
                      <p className="font-mono font-medium text-sm">{message.tradePreview.size}</p>
                    </div>
                    <div>
                      <p className="text-caption">Risk Level</p>
                      <div className="flex items-center gap-1">
                        {message.tradePreview.riskLevel === "High" && (
                          <AlertTriangle className="h-3 w-3 text-yellow-400" />
                        )}
                        <p
                          className={cn(
                            "font-medium text-sm",
                            message.tradePreview.riskLevel === "Low" && "text-emerald-400",
                            message.tradePreview.riskLevel === "Medium" && "text-yellow-400",
                            message.tradePreview.riskLevel === "High" && "text-red-400",
                          )}
                        >
                          {message.tradePreview.riskLevel}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full mt-4 bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 font-medium tracking-tight">
                    Execute Trade
                  </Button>
                </div>
              )}
            </div>
            {message.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 pt-4">
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your command..."
            className="flex-1 bg-card border-border/50 focus-visible:ring-primary text-sm"
          />
          <Button
            onClick={handleSend}
            className="bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-caption">Try: &quot;Buy $1000 ETH&quot; or &quot;Show my positions&quot;</p>
      </div>
    </div>
  )
}
