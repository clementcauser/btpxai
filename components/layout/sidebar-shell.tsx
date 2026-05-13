"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "./sidebar"
import { MobileHeader } from "./mobile-header"
import { cn } from "@/lib/utils"

type Role = "admin" | "bureau" | "ouvrier"

export function SidebarShell({
  children,
  email,
  role,
  alertBadge = 0,
  workspaceName,
  logoUrl,
}: {
  children: React.ReactNode
  email: string
  role: Role
  alertBadge?: number
  workspaceName?: string | null
  logoUrl?: string | null
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) setCollapsed(saved === "true")
    setMounted(true)
  }, [])

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem("sidebar-collapsed", String(next))
      return next
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar
          email={email}
          role={role}
          alertBadge={alertBadge}
          workspaceName={workspaceName}
          logoUrl={logoUrl}
          collapsed={mounted ? collapsed : false}
          onToggle={toggle}
        />
      </div>

      {/* Mobile header + drawer */}
      <MobileHeader
        email={email}
        role={role}
        alertBadge={alertBadge}
        workspaceName={workspaceName}
        logoUrl={logoUrl}
      />

      {/* Main content — padding follows sidebar width */}
      <main
        className={cn(
          "min-h-screen transition-[padding-left] duration-200 ease-in-out",
          mounted && collapsed ? "lg:pl-14" : "lg:pl-56"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
