import { Github } from "lucide-react"

export function SocialIcons() {
  return (
    <div className="absolute bottom-20 right-8 flex items-center gap-3">
      <a
        href="#"
        className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors"
      >
        <Github className="w-5 h-5 text-black" />
      </a>
    </div>
  )
}
