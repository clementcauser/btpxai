import Image from "next/image"
import { SidebarNav } from "./sidebar-nav"
import { SidebarUser } from "./sidebar-user"

type Role = "admin" | "bureau" | "ouvrier"

export function AppSidebar({
  email,
  role,
  alertBadge = 0,
  workspaceName,
  logoUrl,
}: {
  email: string
  role: Role
  alertBadge?: number
  workspaceName?: string | null
  logoUrl?: string | null
}) {
  const displayName = workspaceName ?? "BTPxAI"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
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
        <span className="font-heading font-700 text-base tracking-wide text-sidebar-foreground truncate">
          {displayName}
        </span>
      </div>

      {/* Navigation */}
      <SidebarNav role={role} alertBadge={alertBadge} />

      {/* User section */}
      <SidebarUser email={email} role={role} />
    </aside>
  )
}
