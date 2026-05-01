import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { Settings } from "lucide-react"
import { getUser, getUserRole } from "@/lib/supabase/server"
import { supabaseService } from "@/lib/supabase/service"
import { getAutoAcknowledgmentEnabled } from "@/lib/acknowledgments"
import { getLastSyncAt } from "@/lib/sheets"
import { getMultipleSettings } from "@/lib/settings"
import { SettingsShell } from "@/components/parametres/settings-shell"

export const metadata: Metadata = {
  title: "Paramètres — BTP×AI",
}

const SETTINGS_KEYS = [
  "company_name",
  "company_address",
  "company_siret",
  "company_logo_url",
  "weekly_report_recipients",
  "weekly_report_enabled",
  "auto_reminders_enabled",
  "reminder_delay_j7",
  "reminder_delay_j14",
  "default_cgv",
]

type SearchParams = Promise<{ gmail?: string }>

export default async function ParametresPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await getUser()
  if (!user) redirect("/login")

  const role = getUserRole(user)
  if (role !== "admin") redirect("/dashboard")

  const { gmail } = await searchParams

  const [settings, { data: connection }, autoAckEnabled, lastSyncAt, { data: usersData }] =
    await Promise.all([
      getMultipleSettings(SETTINGS_KEYS),
      supabaseService.from("gmail_connections").select("email, created_at").limit(1).single(),
      getAutoAcknowledgmentEnabled(),
      getLastSyncAt(),
      supabaseService.auth.admin.listUsers({ perPage: 200 }),
    ])

  const users = (usersData?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    role: (u.user_metadata?.role as "admin" | "bureau" | "ouvrier" | undefined) ?? null,
    created_at: u.created_at,
  }))

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-wider uppercase">
            Administration
          </span>
        </div>
        <h1 className="font-heading text-3xl font-700 tracking-wide uppercase text-foreground">
          Paramètres
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuration globale de l'application — accès admin uniquement.
        </p>
      </div>

      <SettingsShell
        settings={settings}
        connection={connection}
        gmailParam={gmail}
        autoAckEnabled={autoAckEnabled}
        lastSyncAt={lastSyncAt}
        users={users}
      />
    </div>
  )
}
