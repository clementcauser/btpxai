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
  Package,
  AlertTriangle,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  isAlert?: boolean
}

const bureauNavBase: Omit<NavItem, "badge">[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/devis", label: "Devis", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/inbox", label: "Messagerie", icon: Mail },
  { href: "/materiaux", label: "Matériaux", icon: Package },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/alertes", label: "Alertes", icon: AlertTriangle, isAlert: true },
  { href: "/parametres", label: "Paramètres", icon: Settings },
]

const terrainNav: NavItem[] = [
  { href: "/terrain", label: "Chantier", icon: HardHat },
]

type Role = "admin" | "bureau" | "ouvrier"

function getNavItems(role: Role, alertBadge?: number): NavItem[] {
  if (role === "ouvrier") return terrainNav
  return bureauNavBase.map((item) =>
    item.href === "/alertes" ? { ...item, badge: alertBadge } : item
  )
}

export function SidebarNav({
  role,
  alertBadge,
  collapsed = false,
}: {
  role: Role
  alertBadge?: number
  collapsed?: boolean
}) {
  const pathname = usePathname()
  const items = getNavItems(role, alertBadge)

  return (
    <TooltipProvider delay={0}>
      <nav className="flex-1 py-4 space-y-0.5 overflow-x-hidden">
        {items.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)

          const showBadge = item.badge !== undefined && item.badge > 0

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 py-2.5 text-sm font-medium transition-colors relative group",
                collapsed ? "justify-center px-0 mx-1 rounded-md" : "px-4",
                isActive
                  ? "text-primary bg-primary/10 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary"
                  : item.isAlert && showBadge
                    ? "text-red-400/90 hover:text-red-300 hover:bg-red-950/30"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive
                    ? "text-primary"
                    : item.isAlert && showBadge
                      ? "text-red-400"
                      : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                )}
              />
              {!collapsed && (
                <span className="truncate tracking-wide flex-1">{item.label}</span>
              )}

              {!collapsed && showBadge && (
                <span
                  className="flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none"
                  style={{
                    background: "oklch(0.55 0.22 25)",
                    color: "white",
                    animation: "alertPulse 2.4s ease infinite",
                  }}
                  data-testid="alert-badge"
                >
                  {item.badge! > 99 ? "99+" : item.badge}
                </span>
              )}

              {collapsed && showBadge && (
                <span
                  className="absolute top-1 right-1 size-2 rounded-full"
                  style={{ background: "oklch(0.55 0.22 25)" }}
                  data-testid="alert-badge"
                />
              )}
            </Link>
          )

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={<span className="block" />}>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                  {showBadge && (
                    <span className="ml-1.5 text-red-400">({item.badge})</span>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          }

          return linkContent
        })}
      </nav>
    </TooltipProvider>
  )
}
