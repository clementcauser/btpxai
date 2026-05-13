"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "./sidebar"

export function MobileHeader({
  email,
  role,
  alertBadge = 0,
  workspaceName,
  logoUrl,
}: {
  email: string
  role: "admin" | "bureau" | "ouvrier"
  alertBadge?: number
  workspaceName?: string | null
  logoUrl?: string | null
}) {
  const [open, setOpen] = useState(false)
  const displayName = workspaceName ?? "BTPxAI"

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-4" />
        </Button>
        <span className="font-heading font-700 text-sm tracking-wide truncate">
          {displayName}
        </span>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full">
          <AppSidebar
            email={email}
            role={role}
            alertBadge={alertBadge}
            workspaceName={workspaceName}
            logoUrl={logoUrl}
            onToggle={() => setOpen(false)}
            toggleLabel="Fermer"
            variant="drawer"
          />
        </div>
      </div>
    </>
  )
}
