import { redirect } from "next/navigation"
import { getUser, getUserRole } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function RootPage() {
  const user = await getUser()

  if (!user) redirect("/login")

  const role = getUserRole(user)
  if (role === "super_admin") redirect("/superadmin/workspaces")
  redirect("/dashboard")
}
