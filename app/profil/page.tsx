import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { User } from "lucide-react"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Profil — btpxai",
}

export default async function ProfilPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const role = getUserRole(user) ?? "—"

  const roleClass = cn(
    "uppercase tracking-wider text-[10px] px-2 py-1",
    role === "admin" && "text-primary border-primary/40",
    role === "bureau" && "text-sky-400 border-sky-400/40",
    role === "ouvrier" && "text-emerald-400 border-emerald-400/40",
    role === "super_admin" && "text-violet-400 border-violet-400/40",
  )

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    bureau: "Bureau",
    ouvrier: "Terrain",
    super_admin: "Super Admin",
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-8">
        <header>
          <div className="flex items-center gap-2 mb-1">
            <User className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground tracking-wider uppercase">Compte</span>
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-wide uppercase">Mon profil</h1>
          <div className="mt-4 h-px bg-border" />
        </header>

        <div className="rounded-sm border border-border bg-card p-5 max-w-sm space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Email
            </span>
            <p className="text-sm text-foreground font-mono">{user.email}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Rôle
            </span>
            <div>
              <Badge variant="outline" className={roleClass}>
                {roleLabel[role] ?? role}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
