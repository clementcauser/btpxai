import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspace } from "@/lib/workspaces"
import { getEventTypes } from "@/lib/calendar-event-types"
import { CalendarClient } from "@/components/calendrier/calendar-client"

export const metadata: Metadata = {
  title: "Mon planning — BTP×AI",
}

export default async function TerrainCalendrierPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  const role = getUserRole(user)
  if (role !== "ouvrier" && role !== "admin") redirect("/profil")

  const { workspaceId } = await requireWorkspace(user.id)
  const supabase = await createClient()
  const eventTypes = await getEventTypes(supabase, workspaceId).catch(() => [])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-safe-top">
        <div className="flex items-center gap-3 py-4">
          <CalendarDays className="size-5 text-muted-foreground" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
               style={{ fontFamily: "var(--font-barlow)" }}>
              BTP×AI — Terrain
            </p>
            <h1
              className="text-2xl font-bold uppercase tracking-wide text-foreground leading-none"
              style={{ fontFamily: "var(--font-barlow)" }}
            >
              Mon planning
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        <CalendarClient
          eventTypes={eventTypes}
          workspaceUsers={[]}
          canCreate={false}
          canFilter={false}
        />
      </main>
    </div>
  )
}
