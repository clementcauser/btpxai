import type { Metadata } from "next"
import { Mail } from "lucide-react"
import { supabaseService } from "@/lib/supabase/service"
import { getUser } from "@/lib/supabase/server"
import { requireWorkspace } from "@/lib/workspaces"
import { redirect } from "next/navigation"
import { listEmails } from "@/lib/gmail"
import { getEmailStatuses } from "@/lib/email-statuses"
import { GmailConnectionBanner } from "@/components/inbox/gmail-connection-banner"
import { EmailList } from "@/components/inbox/email-list"
import type { EmailStatusRecord } from "@/types"

export const metadata: Metadata = {
  title: "Messagerie — BTP×AI",
}

export default async function InboxPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  const { workspaceId } = await requireWorkspace(user.id)

  const { data: connection } = await supabaseService
    .from("gmail_connections")
    .select("email")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .single()

  const [emails, clientsResult] = await Promise.all([
    connection
      ? listEmails({ maxResults: 50 }).catch(() => [])
      : Promise.resolve([]),
    supabaseService
      .from("clients")
      .select("id, name, email")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true }),
  ])

  const initialStatuses: Record<string, EmailStatusRecord> =
    connection && emails.length
      ? await getEmailStatuses(workspaceId, emails.map((e) => e.id)).catch(() => ({}))
      : {}

  const clients = (clientsResult.data ?? []) as {
    id: string
    name: string
    email: string | null
  }[]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mail className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-widest uppercase font-mono">
            Communication
          </span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-wide uppercase text-foreground">
          Messagerie
        </h1>
        {connection && (
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            {connection.email}
            <span className="mx-2 text-border">·</span>
            {emails.length} message{emails.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {!connection ? (
        <GmailConnectionBanner />
      ) : (
        <EmailList
          emails={emails}
          initialStatuses={initialStatuses}
          clients={clients}
        />
      )}
    </div>
  )
}
