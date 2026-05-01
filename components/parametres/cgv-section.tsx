"use client"

import { useState, useTransition } from "react"
import { FileText, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

type Props = {
  initialCgv: string
}

export function CgvSection({ initialCgv }: Props) {
  const [value, setValue] = useState(initialCgv)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const res = await fetch("/api/parametres/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "default_cgv", value }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border bg-muted/40">
        <FileText className="size-3.5 text-primary" />
        <span className="text-xs font-medium tracking-wider uppercase text-foreground">
          Conditions générales de vente par défaut
        </span>
      </div>

      <div className="p-5 space-y-3">
        <Label htmlFor="cgv" className="text-xs tracking-wider uppercase text-muted-foreground">
          Texte CGV
        </Label>
        <Textarea
          id="cgv"
          data-testid="cgv-textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={10}
          placeholder="Saisissez vos conditions générales de vente…"
          className="font-mono text-xs resize-y leading-relaxed"
        />
        <p className="text-xs text-muted-foreground">
          Ces CGV seront pré-remplies sur chaque nouveau devis. Vous pourrez les modifier devis par devis.
        </p>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handleSave}
            data-testid="cgv-save-btn"
          >
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
      </div>
    </div>
  )
}
