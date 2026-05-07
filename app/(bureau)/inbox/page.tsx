import type { Metadata } from "next"
import { Mail } from "lucide-react"
import { supabaseService } from "@/lib/supabase/service"
import { getUser } from "@/lib/supabase/server"
import { requireWorkspace } from "@/lib/workspaces"
import { redirect } from "next/navigation"
import { GmailClient } from "@/lib/gmail"
import { CONNECTION_COLORS } from "@/lib/gmail-colors"
import { getEmailStatuses } from "@/lib/email-statuses"
import { GmailConnectionBanner } from "@/components/inbox/gmail-connection-banner"
import { EmailList } from "@/components/inbox/email-list"
import type { EmailStatusRecord, EmailSummaryWithSource } from "@/types"

export const metadata: Metadata = {
  title: "Messagerie — BTP×AI",
}

export default async function InboxPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  const { workspaceId } = await requireWorkspace(user.id)

  const clients_promise = supabaseService
    .from("clients")
    .select("id, name, email")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true })

  const gmailClients = await GmailClient.allForWorkspace(workspaceId)

  const [emailResults, clientsResult] = await Promise.all([
    Promise.all(
      gmailClients.map((client) =>
        client.listEmails({ maxResults: 50 }).catch(() => [])
      )
    ),
    clients_promise,
  ])

  const emails: EmailSummaryWithSource[] = emailResults
    .flatMap((msgs, idx) => {
      const client = gmailClients[idx]!
      return msgs.map((email) => ({
        ...email,
        connectionId: client.connectionId,
        connectionEmail: client.email,
        connectionLabel: client.label,
        connectionColor: CONNECTION_COLORS[idx % CONNECTION_COLORS.length],
      }))
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const initialStatuses: Record<string, EmailStatusRecord> =
    emails.length
      ? await getEmailStatuses(workspaceId, emails.map((e) => e.id)).catch(() => ({}))
      : {}

  const clients = (clientsResult.data ?? []) as {
    id: string
    name: string
    email: string | null
  }[]

  const connections = gmailClients.map((c, idx) => ({
    id: c.connectionId,
    email: c.email,
    label: c.label,
    color: CONNECTION_COLORS[idx % CONNECTION_COLORS.length],
  }))

  const totalCount = emails.length

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
        {connections.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            {connections.length} boîte{connections.length !== 1 ? "s" : ""} connectée{connections.length !== 1 ? "s" : ""}
            <span className="mx-2 text-border">·</span>
            {totalCount} message{totalCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {connections.length === 0 ? (
        <GmailConnectionBanner />
      ) : (
        <EmailList
          emails={emails}
          connections={connections}
          initialStatuses={initialStatuses}
          clients={clients}
        />
      )}
    </div>
  )
}
