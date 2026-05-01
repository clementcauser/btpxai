import type { WeeklyReportData } from "@/lib/weekly-report"
import type { WeeklyReportNarrative } from "@/lib/agents/weekly-report"

function fmtEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function buildWeeklyReportSubject(weekStart: string): string {
  const date = new Date(weekStart)
  const weekLabel = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })
  return `Rapport hebdomadaire — semaine du ${weekLabel}`
}

export function buildWeeklyReportHtml(
  data: WeeklyReportData,
  narrative: WeeklyReportNarrative
): string {
  const weekEndDisplay = new Date(new Date(data.weekRange.end).getTime() - 1)
  const weekLabel = `${fmtDate(data.weekRange.start)} – ${fmtDate(weekEndDisplay.toISOString())}`

  const highlightsHtml = narrative.highlights
    .map(
      (h) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#3f3f46;line-height:1.5;">
          <span style="color:#10b981;font-weight:700;margin-right:8px;">✓</span>${h}
        </td></tr>`
    )
    .join("")

  const attentionHtml =
    narrative.attentionItems.length > 0
      ? `<tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0 0 12px;font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Points d'attention</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;margin-bottom:4px;">
              <tr><td style="padding:16px 20px;">
                ${narrative.attentionItems
                  .map(
                    (item) =>
                      `<p style="margin:0 0 8px;font-size:14px;color:#92400e;line-height:1.5;">
                        <span style="font-weight:700;margin-right:8px;">⚠</span>${item}
                      </p>`
                  )
                  .join("")}
                <p style="margin:0;"></p>
              </td></tr>
            </table>
          </td>
        </tr>`
      : ""

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${buildWeeklyReportSubject(data.weekRange.start)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">

          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:32px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">BTP × AI Métallerie</p>
              <p style="margin:4px 0 0;font-size:13px;color:#a1a1aa;">12 rue de la Forge, 75001 Paris · 01 23 45 67 89</p>
            </td>
          </tr>

          <!-- Report title -->
          <tr>
            <td style="padding:32px 40px 24px;">
              <p style="margin:0 0 4px;display:inline-block;padding:4px 12px;background:#6366f11a;color:#6366f1;font-size:11px;font-weight:600;border-radius:4px;border:1px solid #6366f133;text-transform:uppercase;letter-spacing:0.08em;">Rapport hebdomadaire</p>
              <h1 style="margin:16px 0 4px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.02em;">Bilan de la semaine</h1>
              <p style="margin:0;font-size:14px;color:#71717a;">${weekLabel}</p>
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding:0 40px 24px;">
              <p style="margin:0;font-size:15px;color:#3f3f46;line-height:1.7;">${narrative.summary}</p>
            </td>
          </tr>

          <!-- Stats grid -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 12px;font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Chiffres de la semaine</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:6px;overflow:hidden;">
                <tr style="background:#fafafa;">
                  <td style="padding:16px 20px;border-right:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;width:25%;" align="center">
                    <p style="margin:0 0 4px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.08em;">Devis envoyés</p>
                    <p style="margin:0;font-size:26px;font-weight:700;color:#18181b;">${data.quotes.sent}</p>
                  </td>
                  <td style="padding:16px 20px;border-right:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;width:25%;" align="center">
                    <p style="margin:0 0 4px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.08em;">Acceptés</p>
                    <p style="margin:0;font-size:26px;font-weight:700;color:#10b981;">${data.quotes.accepted}</p>
                  </td>
                  <td style="padding:16px 20px;border-right:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;width:25%;" align="center">
                    <p style="margin:0 0 4px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.08em;">Refusés</p>
                    <p style="margin:0;font-size:26px;font-weight:700;color:#ef4444;">${data.quotes.rejected}</p>
                  </td>
                  <td style="padding:16px 20px;border-bottom:1px solid #e4e4e7;width:25%;" align="center">
                    <p style="margin:0 0 4px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.08em;">Chantiers actifs</p>
                    <p style="margin:0;font-size:26px;font-weight:700;color:#18181b;">${data.projects.inProgressTotal}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="4" style="padding:16px 20px;" align="center">
                    <p style="margin:0 0 4px;font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.08em;">CA réalisé (HT)</p>
                    <p style="margin:0;font-size:32px;font-weight:700;color:#18181b;">${fmtEur(data.quotes.caRealiseHT)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Highlights -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 12px;font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Points forts</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${highlightsHtml}
              </table>
            </td>
          </tr>

          <!-- Attention points (conditional) -->
          ${attentionHtml}

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #e4e4e7;margin-top:32px;">
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
