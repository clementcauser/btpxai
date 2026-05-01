"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Bell, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  reminder_delay_j7: z.coerce.number().int().min(1).max(30),
  reminder_delay_j14: z.coerce.number().int().min(1).max(60),
})

type FormValues = z.infer<typeof schema>

type Props = {
  initialSettings: Record<string, string>
}

async function patchSetting(key: string, value: string) {
  return fetch("/api/parametres/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  })
}

export function RemindersSection({ initialSettings }: Props) {
  const [enabled, setEnabled] = useState(
    initialSettings.auto_reminders_enabled !== "false"
  )
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      reminder_delay_j7: Number(initialSettings.reminder_delay_j7 ?? 7),
      reminder_delay_j14: Number(initialSettings.reminder_delay_j14 ?? 14),
    },
  })

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleToggle() {
    startTransition(async () => {
      const next = !enabled
      const res = await patchSetting("auto_reminders_enabled", String(next))
      if (res.ok) { setEnabled(next); flash() }
    })
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      await Promise.all([
        patchSetting("reminder_delay_j7", String(data.reminder_delay_j7)),
        patchSetting("reminder_delay_j14", String(data.reminder_delay_j14)),
      ])
      flash()
    })
  }

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border bg-muted/40">
        <Bell className="size-3.5 text-primary" />
        <span className="text-xs font-medium tracking-wider uppercase text-foreground">
          Relances automatiques
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Global toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Activer les relances</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Envoie des relances automatiques pour les devis sans réponse.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={enabled}
            onClick={handleToggle}
            disabled={isPending}
            data-testid="reminders-toggle"
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

        {/* Delay configuration */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="delay_j7" className="text-xs tracking-wider uppercase text-muted-foreground">
                1re relance (jours)
              </Label>
              <Input
                id="delay_j7"
                type="number"
                min={1}
                max={30}
                data-testid="reminders-delay-j7"
                className="font-mono"
                {...register("reminder_delay_j7")}
              />
              {errors.reminder_delay_j7 && (
                <p className="text-xs text-destructive">{errors.reminder_delay_j7.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delay_j14" className="text-xs tracking-wider uppercase text-muted-foreground">
                2e relance (jours)
              </Label>
              <Input
                id="delay_j14"
                type="number"
                min={1}
                max={60}
                data-testid="reminders-delay-j14"
                className="font-mono"
                {...register("reminder_delay_j14")}
              />
              {errors.reminder_delay_j14 && (
                <p className="text-xs text-destructive">{errors.reminder_delay_j14.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              Sauvegarder
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-xs text-primary animate-in fade-in duration-200">
                <CheckCircle2 className="size-3.5" />
                Sauvegardé
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
