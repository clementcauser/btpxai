"use client"

import { useState } from "react"
import { Mail, CheckCircle, XCircle, Loader2, Plus, Trash2 } from "lucide-react"
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
import type { GmailConnection } from "@/types"

type Props = {
  connections: Pick<GmailConnection, "id" | "email" | "label">[]
  gmailParam?: string
}

export function GmailConnectionSection({ connections, gmailParam }: Props) {
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [label, setLabel] = useState("")

  async function handleDisconnect(id: string) {
    setDisconnecting(id)
    try {
      await fetch(`/api/gmail/connections/${id}`, { method: "DELETE" })
      window.location.reload()
    } finally {
      setDisconnecting(null)
    }
  }

  function handleConnect() {
    const l = label.trim() || "Boîte principale"
    window.location.href = `/api/gmail/auth?label=${encodeURIComponent(l)}`
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Mail className="size-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium text-foreground">Boîtes mail</h3>
            <p className="text-sm text-muted-foreground">
              Connectez les boîtes Gmail de l'entreprise pour gérer les emails depuis l'inbox.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => { setLabel(""); setShowConnectDialog(true) }}>
          <Plus className="size-4" />
          Connecter
        </Button>
      </div>

      {gmailParam === "connected" && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-md px-3 py-2">
          <CheckCircle className="size-4" />
          Boîte mail connectée avec succès.
        </div>
      )}

      {gmailParam === "error" && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          <XCircle className="size-4" />
          Erreur lors de la connexion. Veuillez réessayer.
        </div>
      )}

      {connections.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aucune boîte connectée.</p>
      ) : (
        <div className="space-y-2">
          {connections.map((conn, idx) => (
            <div
              key={conn.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CONNECTION_COLORS[idx % CONNECTION_COLORS.length] }}
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

      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Connecter une boîte Gmail</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="gmail-label">Label de la boîte</Label>
              <Input
                id="gmail-label"
                placeholder="ex: Contact, Commercial, Support…"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              />
              <p className="text-xs text-muted-foreground">
                Affiché dans l'inbox pour identifier la boîte d'origine.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleConnect}>
              <Mail className="size-4" />
              Continuer vers Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
