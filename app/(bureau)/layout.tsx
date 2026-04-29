import { redirect } from "next/navigation"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/layout/sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"

type Role = "admin" | "bureau" | "ouvrier"

export default async function BureauLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const role = (getUserRole(user) as Role) ?? "bureau"

  if (role !== "admin" && role !== "bureau") {
    redirect("/profil")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar email={user.email!} role={role} />
      </div>

      {/* Mobile header + drawer */}
      <MobileHeader email={user.email!} role={role} />

      {/* Main content */}
      <main className="lg:pl-56 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
