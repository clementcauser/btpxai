"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, Users, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const navItems = [
  { href: "/admin/entreprises", label: "Entreprises", icon: Building2, testId: "admin-nav-entreprises" },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users, testId: "admin-nav-utilisateurs" },
]

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col"
      style={{
        background: "#0C0E14",
        borderRight: "1px solid #1A1E2A",
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: "1px solid #1A1E2A" }}
      >
        <div
          className="size-8 rounded flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, #1A2A4A 0%, #0D1829 100%)",
            border: "1px solid #2A3D5A",
          }}
        >
          <span className="font-mono font-bold text-sm text-[#4F8EF7]">B</span>
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="font-heading font-bold text-sm tracking-widest text-white uppercase">
            BTP<span className="text-[#4F8EF7]">×</span>AI
          </span>
          <span
            className="text-[9px] tracking-widest uppercase font-mono"
            style={{ color: "#4F8EF7", opacity: 0.6 }}
          >
            Administration
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 space-y-0.5 px-3">
        <p
          className="px-2 mb-2 text-[9px] font-mono tracking-widest uppercase"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          Plateforme
        </p>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150",
                isActive
                  ? "text-white"
                  : "hover:text-white"
              )}
              style={
                isActive
                  ? { background: "rgba(79,142,247,0.12)", color: "#fff", borderLeft: "2px solid #4F8EF7", paddingLeft: "10px" }
                  : { color: "rgba(255,255,255,0.45)" }
              }
            >
              <item.icon className="size-4 shrink-0" />
              <span className="tracking-wide">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid #1A1E2A" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="size-7 rounded-full flex items-center justify-center shrink-0 font-mono font-bold text-xs"
            style={{ background: "#1A2A4A", color: "#4F8EF7", border: "1px solid #2A3D5A" }}
          >
            {email[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/70 truncate leading-tight">{email}</p>
            <span
              className="text-[9px] font-mono tracking-wider uppercase"
              style={{ color: "#F59E0B" }}
            >
              admin
            </span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors hover:text-white"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <LogOut className="size-3.5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
