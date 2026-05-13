"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const roleLabels: Record<string, string> = {
  admin: "Admin",
  bureau: "Bureau",
  ouvrier: "Terrain",
}

const roleColors: Record<string, string> = {
  admin: "text-primary border-primary/40",
  bureau: "text-sky-400 border-sky-400/40",
  ouvrier: "text-emerald-400 border-emerald-400/40",
}

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase()
}

export function SidebarUser({
  email,
  role,
  collapsed = false,
}: {
  email: string
  role: string
  collapsed?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (collapsed) {
    return (
      <div className="border-t border-sidebar-border p-2 flex flex-col items-center gap-2">
        <Avatar className="size-7 shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
            {initials(email)}
          </AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
          disabled={loading}
          title="Se déconnecter"
        >
          <LogOut className="size-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 px-1 mb-3">
        <Avatar className="size-7 shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
            {initials(email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-sidebar-foreground truncate">
            {email}
          </p>
          <Badge
            variant="outline"
            className={`mt-0.5 text-[10px] px-1.5 py-0 h-4 ${roleColors[role] ?? ""}`}
          >
            {roleLabels[role] ?? role}
          </Badge>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 h-8 px-2 text-xs"
        onClick={handleSignOut}
        disabled={loading}
      >
        <LogOut className="size-3.5" />
        {loading ? "Déconnexion…" : "Se déconnecter"}
      </Button>
    </div>
  )
}
