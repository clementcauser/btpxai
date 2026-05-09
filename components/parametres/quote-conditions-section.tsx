"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { FileText, Loader2, CheckCircle2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type FormValues = {
  conditions: { text: string }[]
}

type Props = {
  initialConditions: string[]
}

export function QuoteConditionsSection({ initialConditions }: Props) {
  const { control, register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      conditions: initialConditions.length > 0
        ? initialConditions.map((text) => ({ text }))
        : [{ text: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "conditions" })
  const [saved, setSaved] = useState(false)

  async function onSubmit(data: FormValues) {
    const conditions = data.conditions.map((c) => c.text).filter(Boolean)
    const res = await fetch("/api/parametres/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "quote_conditions", value: JSON.stringify(conditions) }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border bg-muted/40">
        <FileText className="size-3.5 text-primary" />
        <span className="text-xs font-medium tracking-wider uppercase text-foreground">
          Conditions générales du devis
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground">
          Chaque ligne correspond à une condition affichée dans le PDF du devis.
          1 ligne = 1 condition générale.
        </p>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
                {index + 1}.
              </span>
              <Input
                {...register(`conditions.${index}.text`)}
                placeholder={`Condition ${index + 1}…`}
                className="text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          onClick={() => append({ text: "" })}
        >
          <Plus className="size-3.5" />
          Ajouter une condition
        </Button>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" size="sm" disabled={isSubmitting}>
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
