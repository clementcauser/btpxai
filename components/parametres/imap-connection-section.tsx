"use client"

import { useState } from "react"
import { Server, Loader2, Plus, Trash2, CheckCircle, XCircle, ChevronLeft, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CONNECTION_COLORS } from "@/lib/gmail-colors"
import type { ImapConnectionSummary } from "@/types"
import type { ProviderConfig } from "@/lib/email-providers"

const PROVIDER_HINTS: Record<string, { label: string; url: string; message: string }> = {
  "orange.fr": {
    label: "Orange",
    url: "https://assistance.orange.fr/ordinateurs-peripheriques/installer-et-utiliser/la-messagerie/messagerie-sur-application/configurer-sa-messagerie-sur-une-application_19759-19909",
    message:
      "Orange désactive l'accès IMAP par défaut. Activez-le dans les paramètres de votre webmail Orange (Paramètres → Mon compte → Accès à la messagerie par des logiciels).",
  },
  "wanadoo.fr": {
    label: "Orange / Wanadoo",
    url: "https://assistance.orange.fr/ordinateurs-peripheriques/installer-et-utiliser/la-messagerie/messagerie-sur-application/configurer-sa-messagerie-sur-une-application_19759-19909",
    message:
      "Orange désactive l'accès IMAP par défaut. Activez-le dans les paramètres de votre webmail Orange.",
  },
  "sfr.fr": {
    label: "SFR",
    url: "https://assistance.sfr.fr/internet-tel-fixe/email-sfr/configurer-application.html",
    message:
      "Vérifiez que l'accès IMAP est activé dans votre espace client SFR (Mon compte → Ma messagerie).",
  },
  "laposte.net": {
    label: "La Poste",
    url: "https://www.laposte.fr/assistance/courrier/services-en-ligne/messagerie-laposte/comment-configurer-la-messagerie-laposte-net-sur-un-logiciel-de-messagerie",
    message:
      "La Poste peut nécessiter un mot de passe applicatif. Générez-en un depuis les paramètres de sécurité de votre compte laposte.net.",
  },
  "yahoo.fr": {
    label: "Yahoo",
    url: "https://help.yahoo.com/kb/generate-third-party-passwords-sln15241.html",
    message:
      "Yahoo requiert un mot de passe d'application. Générez-en un depuis la sécurité de votre compte Yahoo.",
  },
  "yahoo.com": {
    label: "Yahoo",
    url: "https://help.yahoo.com/kb/generate-third-party-passwords-sln15241.html",
    message:
      "Yahoo requiert un mot de passe d'application. Générez-en un depuis la sécurité de votre compte Yahoo.",
  },
  "icloud.com": {
    label: "iCloud",
    url: "https://support.apple.com/fr-fr/102654",
    message:
      "iCloud requiert un mot de passe d'application spécifique. Générez-en un sur appleid.apple.com.",
  },
  "me.com": {
    label: "iCloud",
    url: "https://support.apple.com/fr-fr/102654",
    message:
      "iCloud requiert un mot de passe d'application spécifique. Générez-en un sur appleid.apple.com.",
  },
}

type Props = {
  connections: ImapConnectionSummary[]
  colorOffset?: number
}

type Step = "idle" | "form" | "confirm"

type FormData = {
  email: string
  password: string
  label: string
}

type ServerConfig = ProviderConfig & { detected: boolean }

const DEFAULT_CONFIG: ServerConfig = {
  detected: false,
  imap: { host: "", port: 993, secure: true },
  smtp: { host: "", port: 587, secure: false },
}

export function ImapConnectionSection({ connections, colorOffset = 0 }: Props) {
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [step, setStep] = useState<Step>("idle")
  const [formData, setFormData] = useState<FormData>({ email: "", password: "", label: "" })
  const [serverConfig, setServerConfig] = useState<ServerConfig>(DEFAULT_CONFIG)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDisconnect(id: string) {
    setDisconnecting(id)
    try {
      await fetch(`/api/imap/connections/${id}`, { method: "DELETE" })
      window.location.reload()
    } finally {
      setDisconnecting(null)
    }
  }

  function openDialog() {
    setFormData({ email: "", password: "", label: "" })
    setServerConfig(DEFAULT_CONFIG)
    setError(null)
    setStep("form")
  }

  async function handleDetect() {
    if (!formData.email || !formData.password) return
    setIsDetecting(true)
    setError(null)
    try {
      const res = await fetch("/api/imap/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "detect", email: formData.email }),
      })
      const data = await res.json()
      if (data.config) {
        setServerConfig({ ...data.config, detected: true })
      } else {
        setServerConfig({ ...DEFAULT_CONFIG, detected: false })
      }
      setStep("confirm")
    } catch {
      setError("Impossible de détecter les paramètres. Vérifiez votre connexion.")
    } finally {
      setIsDetecting(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/imap/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "save",
          email: formData.email,
          password: formData.password,
          label: formData.label.trim() || "Boîte principale",
          imap_host: serverConfig.imap.host,
          imap_port: serverConfig.imap.port,
          imap_secure: serverConfig.imap.secure,
          smtp_host: serverConfig.smtp.host,
          smtp_port: serverConfig.smtp.port,
          smtp_secure: serverConfig.smtp.secure,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la connexion.")
        return
      }
      window.location.reload()
    } catch {
      setError("Erreur réseau. Veuillez réessayer.")
    } finally {
      setIsSaving(false)
    }
  }

  const isDialogOpen = step === "form" || step === "confirm"
  const isGmail = /^[^@]+@(gmail|googlemail)\.com$/i.test(formData.email)
  const emailDomain = formData.email.split("@")[1]?.toLowerCase() ?? ""
  const providerHint = !isGmail ? (PROVIDER_HINTS[emailDomain] ?? null) : null

  return (
    <div className="rounded-sm border border-border p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Server className="size-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium text-foreground">Autres boîtes mail</h3>
            <p className="text-sm text-muted-foreground">
              Connectez n'importe quelle boîte mail via IMAP/SMTP (Orange, Yahoo, SFR…).
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openDialog}>
          <Plus className="size-4" />
          Connecter
        </Button>
      </div>

      {connections.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aucune boîte connectée.</p>
      ) : (
        <div className="space-y-2">
          {connections.map((conn, idx) => (
            <div
              key={conn.id}
              className="flex items-center justify-between gap-3 rounded-sm border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      CONNECTION_COLORS[(colorOffset + idx) % CONNECTION_COLORS.length],
                  }}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{conn.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{conn.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                disabled={disconnecting === conn.id}
                onClick={() => handleDisconnect(conn.id)}
              >
                {disconnecting === conn.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) setStep("idle")
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {step === "confirm" && (
                <button
                  onClick={() => setStep("form")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
              )}
              {step === "form" ? "Connecter une boîte mail" : "Vérifier les paramètres"}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-sm px-3 py-2">
              <XCircle className="size-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {step === "form" && (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="imap-email">Adresse email</Label>
                <Input
                  id="imap-email"
                  type="email"
                  placeholder="contact@exemple.fr"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                />
                {isGmail && (
                  <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 rounded-sm px-3 py-2 mt-1">
                    <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                    <span>
                      Gmail est déjà intégré via OAuth dans l'onglet ci-dessus.{" "}
                      Pour connecter Gmail ici, vous aurez besoin d'un{" "}
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 font-medium"
                      >
                        mot de passe d'application
                      </a>{" "}
                      à la place de votre mot de passe habituel.
                    </span>
                  </div>
                )}
                {providerHint && (
                  <div className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/10 border border-blue-200 dark:border-blue-400/20 rounded-sm px-3 py-2 mt-1">
                    <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                    <span>
                      {providerHint.message}{" "}
                      <a
                        href={providerHint.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 font-medium whitespace-nowrap"
                      >
                        Voir l'aide {providerHint.label}
                      </a>
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imap-password">Mot de passe</Label>
                <Input
                  id="imap-password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {isGmail
                    ? "Utilisez un mot de passe d'application Google (16 caractères)."
                    : "Pour Yahoo et iCloud, utilisez un mot de passe d'application."}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imap-label">Nom de la boîte</Label>
                <Input
                  id="imap-label"
                  placeholder="ex: Contact, Commercial…"
                  value={formData.label}
                  onChange={(e) => setFormData((p) => ({ ...p, label: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleDetect()}
                />
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-4 py-2">
              {serverConfig.detected ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-sm px-3 py-2">
                  <CheckCircle className="size-4 shrink-0" />
                  Paramètres détectés automatiquement. Vous pouvez les modifier si besoin.
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Fournisseur non reconnu. Renseignez les paramètres manuellement.
                </p>
              )}

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  IMAP (réception)
                </p>
                <div className="grid grid-cols-[1fr_80px_auto] gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Serveur</Label>
                    <Input
                      value={serverConfig.imap.host}
                      placeholder="imap.exemple.fr"
                      onChange={(e) =>
                        setServerConfig((p) => ({ ...p, imap: { ...p.imap, host: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Port</Label>
                    <Input
                      type="number"
                      value={serverConfig.imap.port}
                      onChange={(e) =>
                        setServerConfig((p) => ({
                          ...p,
                          imap: { ...p.imap, port: parseInt(e.target.value) || 993 },
                        }))
                      }
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground pb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serverConfig.imap.secure}
                      onChange={(e) =>
                        setServerConfig((p) => ({ ...p, imap: { ...p.imap, secure: e.target.checked } }))
                      }
                      className="accent-primary"
                    />
                    SSL
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  SMTP (envoi)
                </p>
                <div className="grid grid-cols-[1fr_80px_auto] gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Serveur</Label>
                    <Input
                      value={serverConfig.smtp.host}
                      placeholder="smtp.exemple.fr"
                      onChange={(e) =>
                        setServerConfig((p) => ({ ...p, smtp: { ...p.smtp, host: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Port</Label>
                    <Input
                      type="number"
                      value={serverConfig.smtp.port}
                      onChange={(e) =>
                        setServerConfig((p) => ({
                          ...p,
                          smtp: { ...p.smtp, port: parseInt(e.target.value) || 587 },
                        }))
                      }
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground pb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serverConfig.smtp.secure}
                      onChange={(e) =>
                        setServerConfig((p) => ({ ...p, smtp: { ...p.smtp, secure: e.target.checked } }))
                      }
                      className="accent-primary"
                    />
                    SSL
                  </label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStep("idle")}>
              Annuler
            </Button>
            {step === "form" ? (
              <Button
                onClick={handleDetect}
                disabled={!formData.email || !formData.password || isDetecting}
              >
                {isDetecting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Server className="size-4" />
                )}
                Détecter les paramètres
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={
                  !serverConfig.imap.host ||
                  !serverConfig.smtp.host ||
                  isSaving
                }
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle className="size-4" />
                )}
                Tester &amp; Connecter
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
