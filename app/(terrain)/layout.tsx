import { redirect } from "next/navigation"
import { getUser, getUserRole } from "@/lib/supabase/server"

export default async function TerrainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const role = getUserRole(user)
  if (role !== "admin" && role !== "ouvrier") {
    redirect("/profil")
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <p className="text-sm text-zinc-500">
          Interface terrain — {user.email}
        </p>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
