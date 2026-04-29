"use client"

import type { EmailSummary } from "@/types"

type Props = {
  emails: EmailSummary[]
}

export function EmailList({ emails }: Props) {
  return (
    <div>
      {emails.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Aucun email dans la boîte de réception.
        </p>
      )}
    </div>
  )
}
