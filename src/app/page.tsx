import { AnimatedShaderBackground } from "@/components/animated-shader-background"
import { StatsTicker } from "@/components/stats-ticker"
import { SocialIcons } from "@/components/social-icons"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Page() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-black">
      <AnimatedShaderBackground />

      {/* Crimson Accent Bar */}
      <div className="absolute right-0 top-0 bottom-0 w-3 bg-primary z-20" />

      {/* Navigation - matches dashboard header styling */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <svg className="h-7 w-7 text-primary" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 4L4 12v8l12 8 12-8v-8L16 4z" />
            <path d="M4 12l12 8 12-8" />
            <path d="M16 20v8" />
          </svg>
          <span className="bg-gradient-to-r from-primary to-red-500 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            Monsoon
          </span>
        </div>

        <div className="flex items-center gap-8">
          <a href="#" className="text-sm font-medium tracking-tight text-white/70 hover:text-white transition-colors">
            Docs
          </a>
          <Link href="/dashboard/trade">
            <Button className="bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 text-white border-0 px-6 font-medium tracking-tight">
              Enter App
            </Button>
          </Link>
        </div>
      </nav>

      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <h1
          className="text-7xl md:text-9xl font-bold tracking-tighter text-white/90 
                     transition-all duration-500 ease-out cursor-default pointer-events-auto
                     hover:text-white hover:drop-shadow-[0_0_25px_rgba(220,38,38,0.8)] 
                     hover:drop-shadow-[0_0_50px_rgba(220,38,38,0.5)]
                     [text-shadow:0_0_10px_rgba(220,38,38,0.3)]
                     hover:[text-shadow:0_0_30px_rgba(220,38,38,0.8),0_0_60px_rgba(220,38,38,0.5),0_0_100px_rgba(220,38,38,0.3)]"
        >
          MONSOON
        </h1>
      </div>

      {/* Social Icons */}
      <SocialIcons />

      {/* Stats Ticker */}
      <StatsTicker />
    </main>
  )
}
