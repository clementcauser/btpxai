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
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  )
}
