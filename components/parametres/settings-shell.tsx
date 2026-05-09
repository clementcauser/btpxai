"use client"

import { useState } from "react"
import { Building2, Zap, Plug, Users } from "lucide-react"
import { CompanySection } from "./company-section"
import { ReportRecipientsSection } from "./report-recipients-section"
import { RemindersSection } from "./reminders-section"
import { CgvSection } from "./cgv-section"
import { AutoAcknowledgmentSection } from "./auto-acknowledgment-section"
import { SheetsSyncSection } from "./sheets-sync-section"
import { GmailConnectionSection } from "./gmail-connection-section"
import { ImapConnectionSection } from "./imap-connection-section"
import { UsersSection } from "./users-section"

type Tab = "entreprise" | "automatisations" | "integrations" | "equipe"

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "entreprise",      label: "Entreprise",      icon: Building2 },
  { id: "automatisations", label: "Automatisations",  icon: Zap },
  { id: "integrations",    label: "Intégrations",     icon: Plug },
  { id: "equipe",          label: "Équipe",            icon: Users },
]

type AdminUser = {
  id: string
  email: string
  role: "admin" | "bureau" | "ouvrier" | null
  created_at: string
}

type GmailConnectionSummary = {
  id: string
  email: string
  label: string
}

type ImapConnectionSummary = { id: string; email: string; label: string }

type Props = {
  settings: Record<string, string>
  connections: GmailConnectionSummary[]
  imapConnections: ImapConnectionSummary[]
  gmailParam?: string
  autoAckEnabled: boolean
  lastSyncAt: string | null
  users: AdminUser[]
}

export function SettingsShell({
  settings,
  connections,
  imapConnections,
  gmailParam,
  autoAckEnabled,
  lastSyncAt,
  users,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("entreprise")

  const recipients = (() => {
    try {
      const parsed: unknown = JSON.parse(settings.weekly_report_recipients ?? "[]")
      return Array.isArray(parsed) ? (parsed as string[]) : []
    } catch {
      return []
    }
  })()

  return (
    <div>
      {/* Tab navigation — industrial segment selector */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            data-testid={`tab-${id}`}
            className={[
              "flex items-center gap-2 px-5 py-3 text-xs font-medium tracking-wider uppercase whitespace-nowrap",
              "border-b-2 transition-colors focus-visible:outline-none",
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            ].join(" ")}
          >
            <Icon className="size-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-w-2xl space-y-4">
        {activeTab === "entreprise" && (
          <>
            <CompanySection initialSettings={settings} />
            <CgvSection initialCgv={settings.default_cgv ?? ""} />
          </>
        )}

        {activeTab === "automatisations" && (
          <>
            <RemindersSection initialSettings={settings} />
            <AutoAcknowledgmentSection initialEnabled={autoAckEnabled} />
            <SheetsSyncSection lastSyncAt={lastSyncAt} sheetsSpreadsheetUrl={settings.sheets_spreadsheet_url ?? null} />
            <ReportRecipientsSection
              initialRecipients={recipients}
              initialEnabled={settings.weekly_report_enabled !== "false"}
            />
          </>
        )}

        {activeTab === "integrations" && (
          <>
            <GmailConnectionSection connections={connections} gmailParam={gmailParam} />
            <ImapConnectionSection
              connections={imapConnections}
              colorOffset={connections.length}
            />
          </>
        )}

        {activeTab === "equipe" && (
          <UsersSection initialUsers={users} />
        )}
      </div>
    </div>
  )
}
