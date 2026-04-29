"use client"

import { useEffect, useState, useTransition } from "react"
import { Reply, Loader2, Send, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { EmailDetail } from "@/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const replySchema = z.object({
  body: z.string().min(1, "Le message ne peut pas être vide"),
})
type ReplyForm = z.infer<typeof replySchema>

type Props = {
  messageId: string
}

export function EmailDetail({ messageId }: Props) {
  const [email, setEmail] = useState<EmailDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [isSending, startSending] = useTransition()

  const form = useForm<ReplyForm>({
    resolver: zodResolver(replySchema),
    defaultValues: { body: "" },
  })

  useEffect(() => {
    setEmail(null)
    setShowReply(false)
    form.reset()

    setIsLoading(true)
    fetch(`/api/gmail/messages/${messageId}`)
      .then((r) => r.json())
      .then((data: { email: EmailDetail }) => setEmail(data.email))
      .catch(() => toast.error("Impossible de charger l'email"))
      .finally(() => setIsLoading(false))
  }, [messageId, form])

  function onSubmit(values: ReplyForm) {
    if (!email) return
    startSending(async () => {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email.from,
          subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
          body: values.body,
          replyToMessageId: email.id,
        }),
      })
      if (!res.ok) {
        toast.error("Erreur lors de l'envoi")
        return
      }
      toast.success("Réponse envoyée")
      setShowReply(false)
      form.reset()
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!email) return null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border space-y-1">
        <h2 className="font-semibold text-foreground text-lg">
          {email.subject || "(Sans objet)"}
        </h2>
        <p className="text-sm text-muted-foreground">
          De : <span className="text-foreground">{email.from}</span>
        </p>
        <p className="text-xs text-muted-foreground">{email.date}</p>
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {email.body.startsWith("<") ? (
          <iframe
            srcDoc={email.body}
            sandbox=""
            className="w-full min-h-[400px] border-0"
            title="Contenu de l'email"
          />
        ) : (
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
            {email.body}
          </pre>
        )}
      </div>

      {/* Réponse */}
      <div className="px-6 py-4 border-t border-border">
        {!showReply ? (
          <Button variant="outline" size="sm" onClick={() => setShowReply(true)}>
            <Reply className="size-4" />
            Répondre
          </Button>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <Textarea
              placeholder="Votre réponse..."
              rows={5}
              {...form.register("body")}
            />
            {form.formState.errors.body && (
              <p className="text-xs text-destructive">
                {form.formState.errors.body.message}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSending}>
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Envoyer
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowReply(false); form.reset() }}
              >
                <X className="size-4" />
                Annuler
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
