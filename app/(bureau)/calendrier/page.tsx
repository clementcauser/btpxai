import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { requireWorkspace } from "@/lib/workspaces"
import { supabaseService } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { getEventTypes } from "@/lib/calendar-event-types"
import { CalendarClient } from "@/components/calendrier/calendar-client"

export const metadata: Metadata = {
  title: "Calendrier — BTP×AI",
}

export default async function CalendrierPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  const role = getUserRole(user)
  if (role !== "admin" && role !== "bureau") redirect("/profil")

  const { workspaceId } = await requireWorkspace(user.id)
  const supabase = await createClient()
  const eventTypes = await getEventTypes(supabase, workspaceId).catch(() => [])

  const { data: usersData } = await supabaseService.auth.admin.listUsers({ perPage: 200 })
  const workspaceUsers = (usersData?.users ?? [])
    .filter((u) => {
      const r = u.user_metadata?.role
      return r === "ouvrier" || r === "bureau" || r === "admin"
    })
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      role: (u.user_metadata?.role as string) ?? null,
    }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground tracking-wider uppercase">
              Planification
            </span>
          </div>
          <h1 className="font-heading text-3xl font-700 tracking-wide uppercase text-foreground">
            Calendrier
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planning de l&apos;entreprise — chantiers, RDV et interventions
          </p>
        </div>
      </div>

      <CalendarClient
        eventTypes={eventTypes}
        workspaceUsers={workspaceUsers}
        canCreate
        canFilter
      />
    </div>
  )
}
