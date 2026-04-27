import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terrain — btpxai",
}

export default function TerrainPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Interface terrain</h1>
      <p className="mt-2 text-zinc-500">Bienvenue sur l&apos;interface chantier.</p>
    </div>
  )
}
