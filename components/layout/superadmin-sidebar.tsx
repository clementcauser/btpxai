"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Building2, Users, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"

const navItems = [
  { href: "/superadmin/workspaces", label: "Espaces de travail", icon: Building2 },
  { href: "/superadmin/users", label: "Utilisateurs", icon: Users },
]

export function SuperAdminSidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
        <div className="size-7 rounded-sm bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
          <span className="text-primary font-heading font-bold text-sm leading-none">B</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-heading font-700 text-base tracking-widest text-sidebar-foreground uppercase">
            BTP<span className="text-primary">×</span>AI
          </span>
          <span className="text-[10px] text-sidebar-foreground/40 tracking-wider uppercase">
            Super Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors relative",
                isActive
                  ? "text-primary bg-primary/10 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon
                className={cn(
                  "size-4 shrink-0",
                  isActive ? "text-primary" : "text-sidebar-foreground/40"
                )}
              />
              <span className="tracking-wide">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-1 mb-3">
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
              {email.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{email}</p>
            <Badge
              variant="outline"
              className="mt-0.5 text-[10px] px-1.5 py-0 h-4 text-violet-400 border-violet-400/40"
            >
              Super Admin
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
    </aside>
  )
}
