import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

export default async function BureauLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const role = (session.user as { role?: string }).role
  if (role !== "admin" && role !== "bureau") {
    redirect("/profil")
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-zinc-900">btpxai</span>
        <p className="text-sm text-zinc-500">
          {session.user.email} — {role}
        </p>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
