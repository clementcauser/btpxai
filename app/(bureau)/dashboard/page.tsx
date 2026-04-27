import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tableau de bord — btpxai",
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Tableau de bord</h1>
      <p className="mt-2 text-zinc-500">Bienvenue dans l&apos;interface bureau.</p>
    </div>
  )
}
