"use client"

import { useState, useTransition } from "react"
import { MailCheck, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

type Props = {
  initialEnabled: boolean
}

export function AutoAcknowledgmentSection({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      const res = await fetch("/api/parametres/acknowledgment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: checked }),
      })
      if (res.ok) setEnabled(checked)
    })
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <MailCheck className="size-5 text-muted-foreground" />
        <div>
          <h3 className="font-medium text-foreground">Accusé de réception automatique</h3>
          <p className="text-sm text-muted-foreground">
            Envoie une réponse automatique à chaque nouveau email reçu. Pas de doublon si
            plusieurs emails du même expéditeur dans les 30 dernières minutes.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        <Switch
          id="auto-ack-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
        <Label htmlFor="auto-ack-toggle" className="text-sm text-muted-foreground cursor-pointer">
          {enabled ? "Activé" : "Désactivé"}
        </Label>
      </div>
    </div>
  )
}
