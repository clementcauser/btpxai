import { redirect } from "next/navigation"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { SuperAdminSidebar } from "@/components/layout/superadmin-sidebar"

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  if (!user) redirect("/login")

  const role = getUserRole(user)
  if (role !== "super_admin") redirect("/dashboard")

  return (
    <div className="min-h-screen bg-background">
      <SuperAdminSidebar email={user.email!} />
      <main className="lg:pl-56 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
