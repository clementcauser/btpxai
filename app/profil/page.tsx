import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Profil — btpxai",
}

export default async function ProfilPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const role = (session.user as { role?: string }).role ?? "—"

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Mon profil</h1>
      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 max-w-sm">
        <p className="text-sm text-zinc-700">
          <span className="font-medium">Email :</span> {session.user.email}
        </p>
        <p className="mt-1 text-sm text-zinc-700">
          <span className="font-medium">Rôle :</span> {role}
        </p>
      </div>
    </div>
  )
}
