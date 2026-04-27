import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

export default async function TerrainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const role = (session.user as { role?: string }).role
  if (role !== "admin" && role !== "ouvrier") {
    redirect("/profil")
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <p className="text-sm text-zinc-500">
          Interface terrain — {session.user.email}
        </p>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
