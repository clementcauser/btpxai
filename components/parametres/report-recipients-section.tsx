"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { BarChart2, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const addSchema = z.object({ email: z.string().email("Email invalide") })
type AddForm = z.infer<typeof addSchema>

type Props = {
  initialRecipients: string[]
  initialEnabled: boolean
}

async function patchSetting(key: string, value: string) {
  return fetch("/api/parametres/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  })
}

export function ReportRecipientsSection({ initialRecipients, initialEnabled }: Props) {
  const [recipients, setRecipients] = useState<string[]>(initialRecipients)
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
  })

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleToggle() {
    startTransition(async () => {
      const next = !enabled
      const res = await patchSetting("weekly_report_enabled", String(next))
      if (res.ok) { setEnabled(next); flash() }
    })
  }

  function onAddEmail(data: AddForm) {
    if (recipients.includes(data.email)) return
    const next = [...recipients, data.email]
    startTransition(async () => {
      const res = await patchSetting("weekly_report_recipients", JSON.stringify(next))
      if (res.ok) { setRecipients(next); reset(); flash() }
    })
  }

  function removeEmail(email: string) {
    const next = recipients.filter((r) => r !== email)
    startTransition(async () => {
      const res = await patchSetting("weekly_report_recipients", JSON.stringify(next))
      if (res.ok) { setRecipients(next); flash() }
    })
  }

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border bg-muted/40">
        <BarChart2 className="size-3.5 text-primary" />
        <span className="text-xs font-medium tracking-wider uppercase text-foreground">
          Rapport hebdomadaire
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Envoi automatique</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rapport envoyé chaque lundi à 8h aux destinataires ci-dessous.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={enabled}
            onClick={handleToggle}
            disabled={isPending}
            className={[
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
              "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              enabled ? "bg-primary" : "bg-input",
            ].join(" ")}
          >
            <span
              className={[
                "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg transition-transform",
                enabled ? "translate-x-5" : "translate-x-0.5",
              ].join(" ")}
            />
          </button>
        </div>

        {/* Recipients list */}
        <div className="space-y-2">
          <Label className="text-xs tracking-wider uppercase text-muted-foreground">
            Destinataires
          </Label>
          {recipients.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucun destinataire configuré.</p>
          ) : (
            <ul className="space-y-1.5">
              {recipients.map((email) => (
                <li
                  key={email}
                  className="flex items-center justify-between gap-2 rounded-sm border border-border px-3 py-2 bg-muted/20"
                >
                  <span className="text-sm font-mono text-foreground">{email}</span>
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add email */}
        <form onSubmit={handleSubmit(onAddEmail)} className="space-y-1.5">
          <div className="flex gap-2">
            <Input
              data-testid="report-recipient-input"
              placeholder="destinataire@email.com"
              type="email"
              className="font-mono text-sm"
              {...register("email")}
            />
            <Button type="submit" size="sm" disabled={isPending} className="shrink-0 gap-1.5">
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Ajouter
            </Button>
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </form>

        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-primary animate-in fade-in duration-200">
            <CheckCircle2 className="size-3.5" />
            Sauvegardé
          </span>
        )}
      </div>
    </div>
  )
}
