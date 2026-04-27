import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AppSidebar } from "@/components/layout/sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"

type Role = "admin" | "bureau" | "ouvrier"

export default async function BureauLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const role = (session.user as { role?: Role }).role ?? "bureau"

  if (role !== "admin" && role !== "bureau") {
    redirect("/profil")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar email={session.user.email} role={role} />
      </div>

      {/* Mobile header + drawer */}
      <MobileHeader email={session.user.email} role={role} />

      {/* Main content */}
      <main className="lg:pl-56 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
