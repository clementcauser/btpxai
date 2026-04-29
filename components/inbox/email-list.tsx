"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { EmailSummary } from "@/types"
import { EmailDetail } from "./email-detail"

type Props = {
  emails: EmailSummary[]
}

function formatEmailDate(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: fr })
  } catch {
    return dateStr
  }
}

export function EmailList({ emails }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    emails[0]?.id ?? null
  )
  const [readIds, setReadIds] = useState<Set<string>>(
    new Set(emails.filter((e) => e.isRead).map((e) => e.id))
  )

  function handleSelect(id: string) {
    setSelectedId(id)
    setReadIds((prev) => new Set([...prev, id]))
  }

  if (emails.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Aucun email dans la boîte de réception.
      </p>
    )
  }

  return (
    <div className="flex gap-0 border border-border rounded-lg overflow-hidden min-h-[600px]">
      {/* Liste */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0 border-r border-border overflow-y-auto">
        {emails.map((email) => {
          const isRead = readIds.has(email.id)
          const isSelected = selectedId === email.id
          return (
            <button
              key={email.id}
              onClick={() => handleSelect(email.id)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border transition-colors",
                isSelected
                  ? "bg-primary/10"
                  : "hover:bg-muted/50",
                !isRead && "bg-blue-50/50"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className={cn("text-sm truncate", !isRead && "font-semibold text-foreground")}>
                  {email.from.replace(/<.*>/, "").trim() || email.from}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatEmailDate(email.date)}
                </span>
              </div>
              <p className={cn("text-sm truncate", isRead ? "text-muted-foreground" : "text-foreground font-medium")}>
                {email.subject || "(Sans objet)"}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {email.snippet}
              </p>
            </button>
          )
        })}
      </div>

      {/* Détail */}
      <div className="flex-1 hidden lg:block">
        {selectedId ? (
          <EmailDetail messageId={selectedId} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Sélectionnez un email
          </div>
        )}
      </div>
    </div>
  )
}
