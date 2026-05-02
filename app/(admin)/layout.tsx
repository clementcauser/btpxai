import { redirect } from "next/navigation"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const role = getUserRole(user)

  if (role !== "admin") {
    redirect("/profil")
  }

  return (
    <div className="min-h-screen bg-[#080A0F] flex">
      <AdminSidebar email={user.email!} />
      <main className="flex-1 ml-60 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
