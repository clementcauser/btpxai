"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Users,
  Mail,
  Settings,
  HardHat,
} from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const bureauNav: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/devis", label: "Devis", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/inbox", label: "Messagerie", icon: Mail },
  { href: "/parametres", label: "Paramètres", icon: Settings },
]

const terrainNav: NavItem[] = [
  { href: "/terrain", label: "Chantier", icon: HardHat },
]

type Role = "admin" | "bureau" | "ouvrier"

function getNavItems(role: Role): NavItem[] {
  if (role === "ouvrier") return terrainNav
  return bureauNav
}

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = getNavItems(role)

  return (
    <nav className="flex-1 py-4 space-y-0.5">
      {items.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors relative group",
              isActive
                ? "text-primary bg-primary/10 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <item.icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
              )}
            />
            <span className="truncate tracking-wide">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
