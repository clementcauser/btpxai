"use client"

import { useState, useTransition } from "react"
import { MailCheck, Loader2 } from "lucide-react"

type Props = {
  initialEnabled: boolean
}

export function AutoAcknowledgmentSection({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const next = !enabled
      const res = await fetch("/api/parametres/acknowledgment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      })
      if (res.ok) setEnabled(next)
    })
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <MailCheck className="size-5 text-muted-foreground" />
        <div>
          <h3 className="font-medium text-foreground">Accusé de réception automatique</h3>
          <p className="text-sm text-muted-foreground">
            Envoie une réponse automatique à chaque nouvel email reçu. Pas de doublon si
            plusieurs emails du même expéditeur dans les 30 dernières minutes.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        <button
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          disabled={isPending}
          className={[
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
            "transition-colors focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            enabled ? "bg-primary" : "bg-input",
          ].join(" ")}
        >
          <span
            className={[
              "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
              enabled ? "translate-x-5" : "translate-x-0.5",
            ].join(" ")}
          />
        </button>
        <span className="text-sm text-muted-foreground">
          {enabled ? "Activé" : "Désactivé"}
        </span>
      </div>
    </div>
  )
}
