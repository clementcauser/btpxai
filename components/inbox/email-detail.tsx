"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Reply,
  Loader2,
  Send,
  X,
  Archive,
  Link2,
  Link2Off,
  User,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import type { EmailDetail as EmailDetailType, EmailStatus, EmailStatusRecord } from "@/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

type Client = { id: string; name: string; email: string | null }

type Props = {
  messageId: string
  email: { id: string; threadId: string; subject: string; from: string }
  statusRecord: EmailStatusRecord | null
  clients: Client[]
  onStatusChange: (status: EmailStatus, clientId?: string | null) => void
}

const STATUS_LABELS: Record<EmailStatus, string> = {
  a_traiter: "À traiter",
  en_cours: "En cours",
  repondu: "Répondu",
  archive: "Archivé",
}

const STATUS_STYLES: Record<EmailStatus, string> = {
  a_traiter: "text-amber-400 bg-amber-400/10 border-amber-400/30 hover:bg-amber-400/20",
  en_cours: "text-blue-400 bg-blue-400/10 border-blue-400/30 hover:bg-blue-400/20",
  repondu: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30 hover:bg-emerald-400/20",
  archive: "text-muted-foreground bg-muted/30 border-border hover:bg-muted/50",
}

const ACTIVE_STATUS_STYLES: Record<EmailStatus, string> = {
  a_traiter: "text-amber-400 bg-amber-400/20 border-amber-400/60 ring-1 ring-amber-400/30",
  en_cours: "text-blue-400 bg-blue-400/20 border-blue-400/60 ring-1 ring-blue-400/30",
  repondu: "text-emerald-400 bg-emerald-400/20 border-emerald-400/60 ring-1 ring-emerald-400/30",
  archive: "text-muted-foreground bg-muted/50 border-border ring-1 ring-border",
}

const replySchema = z.object({
  body: z.string().min(1, "Le message ne peut pas être vide"),
})
type ReplyForm = z.infer<typeof replySchema>

function parseSenderName(from: string): { name: string; address: string } {
  const match = from.match(/^(.+?)\s*<(.+)>$/)
  if (match) return { name: match[1].replace(/^["']|["']$/g, ""), address: match[2] }
  return { name: from, address: from }
}

function parseEmailFromString(from: string): string {
  const match = from.match(/<(.+)>/)
  return match ? match[1] : from
}

export function EmailDetail({
  messageId,
  email: emailSummary,
  statusRecord,
  clients,
  onStatusChange,
}: Props) {
  const [detail, setDetail] = useState<EmailDetailType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showReply, setShowReply] = useState(false)
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [clientSearch, setClientSearch] = useState("")
  const [isSending, startSending] = useTransition()
  const [isArchiving, startArchiving] = useTransition()

  const form = useForm<ReplyForm>({
    resolver: zodResolver(replySchema),
    defaultValues: { body: "" },
  })

  useEffect(() => {
    setDetail(null)
    setShowReply(false)
    setShowClientPicker(false)
    setClientSearch("")
    form.reset()
    setIsLoading(true)

    fetch(`/api/gmail/messages/${messageId}`)
      .then((r) => r.json())
      .then((data: { email: EmailDetailType }) => setDetail(data.email))
      .catch(() => toast.error("Impossible de charger l'email"))
      .finally(() => setIsLoading(false))
  }, [messageId, form])

  function onSubmit(values: ReplyForm) {
    if (!detail) return
    startSending(async () => {
      const subject = detail.subject.startsWith("Re:")
        ? detail.subject
        : `Re: ${detail.subject}`
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: detail.from,
          subject,
          body: values.body,
          replyToMessageId: detail.id,
        }),
      })
      if (!res.ok) {
        toast.error("Erreur lors de l'envoi")
        return
      }
      toast.success("Réponse envoyée")
      onStatusChange("repondu")
      setShowReply(false)
      form.reset()
    })
  }

  function handleArchive() {
    startArchiving(async () => {
      const res = await fetch(`/api/inbox/${messageId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: emailSummary.threadId }),
      })
      if (!res.ok) {
        toast.error("Erreur lors de l'archivage")
        return
      }
      toast.success("Email archivé")
    })
  }

  function handleLinkClient(client: Client) {
    onStatusChange(
      statusRecord?.status ?? "a_traiter",
      client.id
    )
    setShowClientPicker(false)
    setClientSearch("")
    toast.success(`Lié à ${client.name}`)
  }

  function handleUnlinkClient() {
    onStatusChange(statusRecord?.status ?? "a_traiter", null)
    toast.success("Lien client retiré")
  }

  const currentStatus: EmailStatus = statusRecord?.status ?? "a_traiter"
  const linkedClient = statusRecord?.client_id
    ? clients.find((c) => c.id === statusRecord.client_id)
    : null

  const senderAddress = parseEmailFromString(emailSummary.from)
  const autoMatchClient = !linkedClient
    ? clients.find(
        (c) => c.email?.toLowerCase() === senderAddress.toLowerCase()
      )
    : null

  const { name: senderName, address: senderAddr } = parseSenderName(
    emailSummary.from
  )

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(clientSearch.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-280px)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border space-y-3">
        <h2
          data-testid="email-subject"
          className="font-heading text-lg font-bold uppercase tracking-wide text-foreground leading-tight"
        >
          {emailSummary.subject || "(Sans objet)"}
        </h2>

        <div className="flex items-start gap-3">
          <div className="size-8 rounded-sm bg-muted/60 border border-border flex items-center justify-center shrink-0 mt-0.5">
            <User className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{senderName}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {senderAddr}
            </p>
          </div>
        </div>

        {/* Status selector */}
        <div>
          <p className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase mb-2">
            Statut
          </p>
          <div
            data-testid="status-selector"
            className="flex gap-1.5 flex-wrap"
          >
            {(
              ["a_traiter", "en_cours", "repondu", "archive"] as EmailStatus[]
            ).map((s) => (
              <button
                key={s}
                data-testid={`status-btn-${s}`}
                onClick={() => onStatusChange(s)}
                className={cn(
                  "text-[10px] font-mono tracking-wider uppercase px-2.5 py-1 border transition-all",
                  currentStatus === s
                    ? ACTIVE_STATUS_STYLES[s]
                    : STATUS_STYLES[s]
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Client link */}
        <div>
          <p className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase mb-2">
            Client lié
          </p>

          {linkedClient ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 border border-primary/30 bg-primary/8 text-primary">
                <Link2 className="size-3" />
                {linkedClient.name}
              </span>
              <button
                onClick={handleUnlinkClient}
                className="text-muted-foreground hover:text-destructive transition-colors"
                title="Retirer le lien"
              >
                <Link2Off className="size-3.5" />
              </button>
            </div>
          ) : autoMatchClient ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                Correspondance :{" "}
                <span className="text-foreground">{autoMatchClient.name}</span>
              </span>
              <button
                onClick={() => handleLinkClient(autoMatchClient)}
                className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
              >
                Lier
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClientPicker((v) => !v)}
              className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors inline-flex items-center gap-1.5"
            >
              <Link2 className="size-3" />
              Associer un client
            </button>
          )}

          {showClientPicker && (
            <div className="mt-2 border border-border bg-card shadow-lg max-h-40 overflow-y-auto">
              <div className="sticky top-0 border-b border-border bg-card">
                <input
                  autoFocus
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full bg-transparent px-3 py-2 text-xs focus:outline-none placeholder:text-muted-foreground"
                />
              </div>
              {filteredClients.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Aucun client trouvé
                </p>
              ) : (
                filteredClients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleLinkClient(c)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
                  >
                    <span className="font-medium text-foreground">{c.name}</span>
                    {c.email && (
                      <span className="ml-2 text-muted-foreground font-mono text-[10px]">
                        {c.email}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {detail ? (
          detail.body.trimStart().startsWith("<") ? (
            <iframe
              srcDoc={detail.body}
              sandbox=""
              className="w-full min-h-[300px] border-0 bg-white"
              title="Contenu de l'email"
            />
          ) : (
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {detail.body}
            </pre>
          )
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-border space-y-3">
        {!showReply ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReply(true)}
              className="font-mono text-xs tracking-wider uppercase"
            >
              <Reply className="size-3.5" />
              Répondre
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              disabled={isArchiving || currentStatus === "archive"}
              className="font-mono text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground"
            >
              {isArchiving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Archive className="size-3.5" />
              )}
              Archiver
            </Button>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2"
          >
            <Textarea
              placeholder="Votre réponse…"
              rows={4}
              className="text-sm resize-none"
              {...form.register("body")}
            />
            {form.formState.errors.body && (
              <p className="text-xs text-destructive">
                {form.formState.errors.body.message}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={isSending}
                className="font-mono text-xs tracking-wider uppercase"
              >
                {isSending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Envoyer
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReply(false)
                  form.reset()
                }}
                className="font-mono text-xs tracking-wider uppercase"
              >
                <X className="size-3.5" />
                Annuler
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
