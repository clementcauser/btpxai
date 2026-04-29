import type { Metadata } from "next"
import { Mail } from "lucide-react"
import { supabaseService } from "@/lib/supabase/service"
import { listEmails } from "@/lib/gmail"
import { GmailConnectionBanner } from "@/components/inbox/gmail-connection-banner"
import { EmailList } from "@/components/inbox/email-list"

export const metadata: Metadata = {
  title: "Messagerie — BTP×AI",
}

export default async function InboxPage() {
  const { data: connection } = await supabaseService
    .from("gmail_connections")
    .select("email")
    .limit(1)
    .single()

  const emails = connection
    ? await listEmails({ maxResults: 50 }).catch(() => [])
    : []

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mail className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-wider uppercase">
            Communication
          </span>
        </div>
        <h1 className="font-heading text-3xl font-700 tracking-wide uppercase text-foreground">
          Messagerie
        </h1>
        {connection && (
          <p className="mt-1 text-sm text-muted-foreground">
            {connection.email} · {emails.length} email{emails.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {!connection ? (
        <GmailConnectionBanner />
      ) : (
        <EmailList emails={emails} />
      )}
    </div>
  )
}
