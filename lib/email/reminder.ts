import type { QuoteWithContext } from "@/types"
import type { ReminderType } from "@/types"

function fmtEur(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n)
}

function getRef(quote: QuoteWithContext): string {
  return quote.reference ?? `DEV-${quote.id.slice(0, 8).toUpperCase()}`
}

export function buildReminderSubject(
  quote: QuoteWithContext,
  type: ReminderType
): string {
  const ref = getRef(quote)
  if (type === "quote_j7") return `Relance — Votre devis ${ref} est en attente`
  if (type === "quote_j14")
    return `Rappel urgent — Devis ${ref} : validité bientôt expirée`
  return `Rappel paiement — Devis ${ref} accepté`
}

export function buildReminderHtml(
  quote: QuoteWithContext,
  type: ReminderType
): string {
  const ref = getRef(quote)
  const clientName = quote.project.client.name
  const totalHT = quote.total_ht ?? 0
  const tvaRate = quote.tva_rate ?? 20
  const totalTTC = Math.round(totalHT * (1 + tvaRate / 100) * 100) / 100
  const validityDays = quote.validity_days ?? 30
  const projectTitle = quote.project.title || "vos travaux"

  const intro = buildIntro(type, clientName, projectTitle, ref, validityDays)
  const badgeColor = type === "payment" ? "#10b981" : "#f59e0b"
  const badgeText =
    type === "quote_j7"
      ? "Relance J+7"
      : type === "quote_j14"
        ? "Relance J+14"
        : "Rappel paiement"

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${buildReminderSubject(quote, type)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="background:#18181b;padding:32px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">BTP × AI Métallerie</p>
              <p style="margin:4px 0 0;font-size:13px;color:#a1a1aa;">12 rue de la Forge, 75001 Paris · 01 23 45 67 89</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;display:inline-block;padding:4px 12px;background:${badgeColor}1a;color:${badgeColor};font-size:11px;font-weight:600;border-radius:4px;border:1px solid ${badgeColor}33;text-transform:uppercase;letter-spacing:0.08em;">${badgeText}</p>
              <p style="margin:0 0 24px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">DEVIS N° ${ref}</p>
              ${intro}
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #e4e4e7;">
                    <p style="margin:0 0 4px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;">Référence</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#18181b;">${ref}</p>
                  </td>
                  <td style="padding:20px 24px;border-bottom:1px solid #e4e4e7;">
                    <p style="margin:0 0 4px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;">Validité</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#18181b;">${validityDays} jours</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;">Total H.T.</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#18181b;">${fmtEur(totalHT)}</p>
                  </td>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;">Total T.T.C. (TVA ${tvaRate} %)</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#18181b;">${fmtEur(totalTTC)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 32px;font-size:14px;color:#3f3f46;line-height:1.6;">
                Pour toute question, n'hésitez pas à nous contacter en répondant à cet email.
              </p>
              <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.6;">Cordialement,</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#18181b;">L'équipe BTP × AI Métallerie</p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
                BTP × AI Métallerie · SIRET 123 456 789 00010 · contact@btpxai.fr
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildIntro(
  type: ReminderType,
  clientName: string,
  projectTitle: string,
  ref: string,
  validityDays: number
): string {
  if (type === "quote_j7") {
    return `
      <p style="margin:0 0 16px;font-size:16px;color:#18181b;">Bonjour ${clientName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
        Nous revenons vers vous au sujet de notre devis pour <strong>${projectTitle}</strong>.
        Il y a 7 jours, nous vous avons transmis le devis <strong>${ref}</strong> et nous n'avons pas encore eu de retour de votre part.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
        Souhaitez-vous donner suite à ce devis, ou avez-vous des questions ou des modifications à demander ?
        Nous sommes à votre disposition.
      </p>`
  }

  if (type === "quote_j14") {
    return `
      <p style="margin:0 0 16px;font-size:16px;color:#18181b;">Bonjour ${clientName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
        Nous vous contactons une dernière fois au sujet de votre devis <strong>${ref}</strong> pour <strong>${projectTitle}</strong>.
        La période de validité de <strong>${validityDays} jours</strong> arrive à son terme.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
        Si vous souhaitez toujours bénéficier de ce devis, merci de nous faire part de votre décision rapidement.
        Passé ce délai, le tarif indiqué ne pourra plus être garanti.
      </p>`
  }

  return `
    <p style="margin:0 0 16px;font-size:16px;color:#18181b;">Bonjour ${clientName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
      Nous vous remercions d'avoir accepté notre devis <strong>${ref}</strong> pour <strong>${projectTitle}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
      Dans le cadre du suivi de votre dossier, nous vous adressons ce rappel concernant le règlement.
      N'hésitez pas à nous contacter si vous avez des questions relatives au paiement.
    </p>`
}
