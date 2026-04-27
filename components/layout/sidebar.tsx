import { SidebarNav } from "./sidebar-nav"
import { SidebarUser } from "./sidebar-user"

type Role = "admin" | "bureau" | "ouvrier"

export function AppSidebar({
  email,
  role,
}: {
  email: string
  role: Role
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
        {/* Steel plate decoration */}
        <div className="size-7 rounded-sm bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
          <span className="text-primary font-heading font-700 text-sm leading-none">
            B
          </span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-heading font-700 text-base tracking-widest text-sidebar-foreground uppercase">
            BTP<span className="text-primary">×</span>AI
          </span>
          <span className="text-[10px] text-sidebar-foreground/40 tracking-wider uppercase">
            Métallerie
          </span>
        </div>
      </div>

      {/* Navigation */}
      <SidebarNav role={role} />

      {/* User section */}
      <SidebarUser email={email} role={role} />
    </aside>
  )
}
