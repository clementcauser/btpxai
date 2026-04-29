"use client"

import { useState } from "react"
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  connection: { email: string; created_at: string } | null
  gmailParam?: string
}

export function GmailConnectionSection({ connection, gmailParam }: Props) {
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  async function handleDisconnect() {
    setIsDisconnecting(true)
    try {
      await fetch("/api/gmail/auth", { method: "DELETE" })
      window.location.reload()
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Mail className="size-5 text-muted-foreground" />
        <div>
          <h3 className="font-medium text-foreground">Boîte mail</h3>
          <p className="text-sm text-muted-foreground">
            Connectez la boîte Gmail de l'entreprise pour gérer les emails depuis l'application.
          </p>
        </div>
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

      {connection ? (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Connecté en tant que </span>
            <span className="font-medium text-foreground">{connection.email}</span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting && <Loader2 className="size-4 animate-spin" />}
            Déconnecter
          </Button>
        </div>
      ) : (
        <a href="/api/gmail/auth">
          <Button size="sm">
            <Mail className="size-4" />
            Connecter Gmail
          </Button>
        </a>
      )}
    </div>
  )
}
