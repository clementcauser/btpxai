"use client"

import { useState, useRef, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Building2, Upload, Loader2, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  company_name: z.string().max(200),
  company_address: z.string().max(500),
  company_siret: z.string().max(20),
  company_phone: z.string().max(30),
  company_email: z.string().max(200),
  company_tva: z.string().max(30),
})

type FormValues = z.infer<typeof schema>

type Props = {
  initialSettings: Record<string, string>
}

export function CompanySection({ initialSettings }: Props) {
  const [logoUrl, setLogoUrl] = useState(initialSettings.company_logo_url ?? "")
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: initialSettings.company_name ?? "",
      company_address: initialSettings.company_address ?? "",
      company_siret: initialSettings.company_siret ?? "",
      company_phone: initialSettings.company_phone ?? "",
      company_email: initialSettings.company_email ?? "",
      company_tva: initialSettings.company_tva ?? "",
    },
  })

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const res = await fetch("/api/parametres/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLogoError(null)
    setLogoUploading(true)
    const form = new FormData()
    form.append("file", file)

    try {
      const res = await fetch("/api/parametres/company/logo", {
        method: "POST",
        body: form,
      })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok) {
        setLogoError(json.error ?? "Erreur upload")
      } else {
        setLogoUrl(json.url ?? "")
      }
    } catch {
      setLogoError("Erreur réseau")
    } finally {
      setLogoUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div
      data-testid="company-section"
      className="rounded-sm border border-border overflow-hidden"
    >
      {/* Panel header */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border bg-muted/40">
        <Building2 className="size-3.5 text-primary" />
        <span className="text-xs font-medium tracking-wider uppercase text-foreground">
          Informations entreprise
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
        {/* Logo */}
        <div className="space-y-2">
          <Label className="text-xs tracking-wider uppercase text-muted-foreground">
            Logo
          </Label>
          <div className="flex items-center gap-4">
            <div
              className="relative size-16 rounded-sm border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo entreprise"
                  className="object-contain size-full p-1"
                />
              ) : (
                <Building2 className="size-6 text-muted-foreground/40" />
              )}
            </div>
            <div className="space-y-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={logoUploading}
                onClick={() => fileRef.current?.click()}
                className="gap-2 text-xs h-8"
              >
                {logoUploading
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Upload className="size-3.5" />
                }
                {logoUploading ? "Envoi…" : "Changer le logo"}
              </Button>
              <p className="text-xs text-muted-foreground">PNG, JPG, WebP — max 2 Mo</p>
              {logoError && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <X className="size-3" /> {logoError}
                </p>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={handleLogoChange}
          />
        </div>

        {/* Nom */}
        <div className="space-y-1.5">
          <Label htmlFor="company_name" className="text-xs tracking-wider uppercase text-muted-foreground">
            Nom de l'entreprise
          </Label>
          <Input
            id="company_name"
            data-testid="company-name-input"
            placeholder="BTP Services Dupont"
            {...register("company_name")}
          />
          {errors.company_name && (
            <p className="text-xs text-destructive">{errors.company_name.message}</p>
          )}
        </div>

        {/* Adresse */}
        <div className="space-y-1.5">
          <Label htmlFor="company_address" className="text-xs tracking-wider uppercase text-muted-foreground">
            Adresse
          </Label>
          <Input
            id="company_address"
            data-testid="company-address-input"
            placeholder="12 rue de la Forge, 75001 Paris"
            {...register("company_address")}
          />
          {errors.company_address && (
            <p className="text-xs text-destructive">{errors.company_address.message}</p>
          )}
        </div>

        {/* SIRET */}
        <div className="space-y-1.5">
          <Label htmlFor="company_siret" className="text-xs tracking-wider uppercase text-muted-foreground">
            SIRET
          </Label>
          <Input
            id="company_siret"
            data-testid="company-siret-input"
            placeholder="12345678900012"
            className="font-mono"
            {...register("company_siret")}
          />
          {errors.company_siret && (
            <p className="text-xs text-destructive">{errors.company_siret.message}</p>
          )}
        </div>

        {/* Téléphone */}
        <div className="space-y-1.5">
          <Label htmlFor="company_phone" className="text-xs tracking-wider uppercase text-muted-foreground">
            Téléphone
          </Label>
          <Input
            id="company_phone"
            data-testid="company-phone-input"
            placeholder="01 23 45 67 89"
            {...register("company_phone")}
          />
          {errors.company_phone && (
            <p className="text-xs text-destructive">{errors.company_phone.message}</p>
          )}
        </div>

        {/* Email de contact */}
        <div className="space-y-1.5">
          <Label htmlFor="company_email" className="text-xs tracking-wider uppercase text-muted-foreground">
            Email de contact
          </Label>
          <Input
            id="company_email"
            data-testid="company-email-input"
            type="email"
            placeholder="contact@entreprise.fr"
            {...register("company_email")}
          />
          {errors.company_email && (
            <p className="text-xs text-destructive">{errors.company_email.message}</p>
          )}
        </div>

        {/* N° TVA */}
        <div className="space-y-1.5">
          <Label htmlFor="company_tva" className="text-xs tracking-wider uppercase text-muted-foreground">
            N° TVA intracommunautaire
          </Label>
          <Input
            id="company_tva"
            data-testid="company-tva-input"
            placeholder="FR12 123456789"
            className="font-mono"
            {...register("company_tva")}
          />
          {errors.company_tva && (
            <p className="text-xs text-destructive">{errors.company_tva.message}</p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            data-testid="company-save-btn"
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
      </form>
    </div>
  )
}
