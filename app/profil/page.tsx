import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getUser, getUserRole } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Profil — btpxai",
}

export default async function ProfilPage() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  const role = getUserRole(user) ?? "—"

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Mon profil</h1>
      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 max-w-sm">
        <p className="text-sm text-zinc-700">
          <span className="font-medium">Email :</span> {user.email}
        </p>
        <p className="mt-1 text-sm text-zinc-700">
          <span className="font-medium">Rôle :</span> {role}
        </p>
      </div>
    </div>
  )
}
