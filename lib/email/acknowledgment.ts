export function buildAcknowledgmentSubject(originalSubject: string): string {
  const prefix = "Re: "
  return originalSubject.startsWith(prefix) ? originalSubject : `${prefix}${originalSubject}`
}

export function buildAcknowledgmentBody(clientName?: string | null, originalSubject?: string): string {
  const greeting = clientName ? `Bonjour ${clientName},` : "Bonjour,"

  return [
    greeting,
    "",
    "Nous avons bien reçu votre message" +
      (originalSubject ? ` concernant "${originalSubject}"` : "") +
      " et nous vous en remercions.",
    "",
    "Notre équipe prendra connaissance de votre demande dans les meilleurs délais et vous répondra sous 24 à 48 heures ouvrées.",
    "",
    "Cordialement,",
    "L'équipe BTP×AI",
  ].join("\n")
}
