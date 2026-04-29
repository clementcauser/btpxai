"use client"

type Props = {
  messageId: string
}

export function EmailDetail({ messageId }: Props) {
  return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
      Chargement de l'email {messageId}...
    </div>
  )
}
