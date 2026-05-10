"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { ScrollText, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type FormValues = {
  cgv: string
}

type Props = {
  initialCgv: string
}

export function CgvSection({ initialCgv }: Props) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { cgv: initialCgv },
  })
  const [saved, setSaved] = useState(false)

  async function onSubmit(data: FormValues) {
    const res = await fetch("/api/parametres/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "default_cgv", value: data.cgv }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border bg-muted/40">
        <ScrollText className="size-3.5 text-primary" />
        <span className="text-xs font-medium tracking-wider uppercase text-foreground">
          Conditions générales de vente (CGV)
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground">
          Texte affiché en bas des devis PDF envoyés aux clients.
        </p>

        <Textarea
          {...register("cgv")}
          data-testid="cgv-textarea"
          rows={6}
          placeholder="Article 1 — …"
          className="text-sm resize-y"
        />

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            size="sm"
            data-testid="cgv-save-btn"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
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
  )
}
