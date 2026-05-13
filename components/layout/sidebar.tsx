import Image from "next/image"
import { SidebarNav } from "./sidebar-nav"
import { SidebarUser } from "./sidebar-user"
import { SidebarToggle } from "./sidebar-toggle"
import { cn } from "@/lib/utils"

type Role = "admin" | "bureau" | "ouvrier"

export function AppSidebar({
  email,
  role,
  alertBadge = 0,
  workspaceName,
  logoUrl,
  collapsed = false,
  onToggle,
  toggleLabel,
  variant = "fixed",
}: {
  email: string
  role: Role
  alertBadge?: number
  workspaceName?: string | null
  logoUrl?: string | null
  collapsed?: boolean
  onToggle?: () => void
  toggleLabel?: string
  variant?: "fixed" | "drawer"
}) {
  const displayName = workspaceName ?? "BTPxAI"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border",
        variant === "fixed"
          ? "fixed inset-y-0 left-0 z-40 transition-[width] duration-200 ease-in-out overflow-hidden"
          : "h-full",
        variant === "fixed" ? (collapsed ? "w-14" : "w-56") : "w-56"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border shrink-0",
          collapsed ? "justify-center px-0 py-5" : "gap-2 px-4 py-5"
        )}
      >
        {logoUrl ? (
          <div className="size-7 rounded-sm overflow-hidden shrink-0 border border-sidebar-border">
            <Image
              src={logoUrl}
              alt={`Logo ${displayName}`}
              width={28}
              height={28}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div className="size-7 rounded-sm bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
            <span className="text-primary font-heading font-700 text-sm leading-none">
              {initial}
            </span>
          </div>
        )}
        {!collapsed && (
          <span className="font-heading font-700 text-base tracking-wide text-sidebar-foreground truncate">
            {displayName}
          </span>
        )}
      </div>

      {/* Navigation */}
      <SidebarNav role={role} alertBadge={alertBadge} collapsed={collapsed} />

      {/* Toggle button — bas de la nav, avant le user */}
      {onToggle && <SidebarToggle collapsed={collapsed} onToggle={onToggle} label={toggleLabel} />}

      {/* User section */}
      <SidebarUser email={email} role={role} collapsed={collapsed} />
    </aside>
  )
}
