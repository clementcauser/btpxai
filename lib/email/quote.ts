import type { QuoteWithContext } from "@/types"
import type { CompanyInfo } from "@/lib/settings"

function fmtEur(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n)
}

export function buildQuoteEmailSubject(quote: QuoteWithContext, company: CompanyInfo): string {
  const ref = quote.reference ?? `DEV-${quote.id.slice(0, 8).toUpperCase()}`
  return `Votre devis ${ref} — ${company.name}`
}

export function buildQuoteEmailHtml(quote: QuoteWithContext, company: CompanyInfo): string {
  const ref = quote.reference ?? `DEV-${quote.id.slice(0, 8).toUpperCase()}`
  const clientName = quote.project.client.name
  const totalHT = quote.total_ht ?? 0
  const tvaRate = quote.tva_rate ?? 20
  const totalTTC = Math.round(totalHT * (1 + tvaRate / 100) * 100) / 100
  const validityDays = quote.validity_days ?? 30
  const projectTitle = quote.project.title || "vos travaux"

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Devis ${ref}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="background:#18181b;padding:32px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${company.name}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#a1a1aa;">${company.address}${company.phone ? ` · ${company.phone}` : ""}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 24px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">DEVIS N° ${ref}</p>
              <p style="margin:0 0 16px;font-size:16px;color:#18181b;">Bonjour ${clientName},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
                Veuillez trouver ci-joint votre devis pour <strong>${projectTitle}</strong>.
                Nous restons à votre disposition pour toute question ou modification.
              </p>
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
                Le devis complet est disponible en pièce jointe (PDF). Pour l'accepter ou demander des modifications, contactez-nous en répondant à cet email.
              </p>
              <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.6;">Cordialement,</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#18181b;">L'équipe ${company.name}</p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
                ${company.name}${company.siret ? ` · SIRET ${company.siret}` : ""}${company.email ? ` · ${company.email}` : ""}
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
