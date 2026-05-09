import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import type { QuoteWithContext } from "@/types"
import type { CompanyInfo } from "@/lib/settings"

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = {
  black: "#0a0a0a",
  graphite: "#1c1c1e",
  mid: "#6b7280",
  light: "#9ca3af",
  rule: "#e5e7eb",
  accent: "#2563eb",
  accentLight: "#eff6ff",
  white: "#ffffff",
  bg: "#f8fafc",
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: PALETTE.black,
    backgroundColor: PALETTE.white,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  companyBlock: { flexDirection: "column", gap: 2 },
  companyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.graphite,
    letterSpacing: 1,
    marginBottom: 4,
  },
  companyDetail: { color: PALETTE.mid, fontSize: 8, lineHeight: 1.5 },

  // Document badge
  docBadge: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  docLabel: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  docRef: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.graphite,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  docMeta: { color: PALETTE.mid, fontSize: 8, marginTop: 2 },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.rule,
    marginBottom: 24,
  },
  accentDivider: {
    borderBottomWidth: 2,
    borderBottomColor: PALETTE.accent,
    marginBottom: 24,
    width: 48,
  },

  // Client / info blocks
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    gap: 24,
  },
  infoBlock: { flex: 1 },
  blockLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  blockValue: { fontSize: 9, color: PALETTE.graphite, lineHeight: 1.6 },
  blockValueBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.graphite,
    lineHeight: 1.6,
  },
  blockValueLight: { fontSize: 8.5, color: PALETTE.mid, lineHeight: 1.6 },

  // Table
  tableContainer: { marginBottom: 20 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: PALETTE.graphite,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 2,
    marginBottom: 1,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: PALETTE.white,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.rule,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: PALETTE.bg,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.rule,
  },
  tableCell: { fontSize: 9, color: PALETTE.graphite, lineHeight: 1.4 },
  tableCellMono: {
    fontSize: 9,
    fontFamily: "Helvetica",
    color: PALETTE.graphite,
  },
  tableCellLight: { fontSize: 8.5, color: PALETTE.mid },
  tableCellBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.graphite,
  },

  // Column widths
  colDesignation: { flex: 1 },
  colQty: { width: 44, textAlign: "right" },
  colUnit: { width: 36, textAlign: "center" },
  colPU: { width: 68, textAlign: "right" },
  colTotal: { width: 72, textAlign: "right" },

  // Totals
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 28,
  },
  totalsBox: {
    width: 220,
    borderWidth: 1,
    borderColor: PALETTE.rule,
    borderRadius: 3,
    overflow: "hidden",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.rule,
  },
  totalsRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: PALETTE.accent,
  },
  totalsLabel: { fontSize: 8, color: PALETTE.mid },
  totalsValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.graphite,
  },
  totalsFinalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.white,
    letterSpacing: 0.5,
  },
  totalsFinalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.white,
  },

  // Notes
  notesSection: { marginBottom: 24 },
  notesLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: PALETTE.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  notesBox: {
    borderWidth: 1,
    borderColor: PALETTE.rule,
    borderLeftWidth: 3,
    borderLeftColor: PALETTE.accent,
    padding: 10,
    borderRadius: 2,
  },
  notesText: { fontSize: 8.5, color: PALETTE.mid, lineHeight: 1.6 },

  // Conditions
  conditionsSection: { marginBottom: 24 },
  conditionsRow: { flexDirection: "row", gap: 4, marginBottom: 3 },
  conditionsBullet: { fontSize: 8, color: PALETTE.accent },
  conditionsText: { fontSize: 8, color: PALETTE.mid, flex: 1, lineHeight: 1.4 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: PALETTE.rule,
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: PALETTE.light },
  footerAccent: { fontSize: 7, color: PALETTE.accent },

  // Row number
  rowNum: {
    fontSize: 7,
    color: PALETTE.light,
    fontFamily: "Helvetica",
    marginRight: 4,
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEur(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function validityDate(createdAt: string, days: number) {
  const d = new Date(createdAt)
  d.setDate(d.getDate() + days)
  return fmtDate(d.toISOString())
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  quote: QuoteWithContext
  company: CompanyInfo
  conditions: string[]
}

export function QuotePDFDocument({ quote, company, conditions }: Props) {
  const ref =
    quote.reference ?? `DEV-${quote.id.slice(0, 8).toUpperCase()}`
  const { client, title: projectTitle } = quote.project

  const totalHT = quote.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  )
  const tvaRate = quote.tva_rate ?? 20
  const totalTVA = totalHT * (tvaRate / 100)
  const totalTTC = totalHT + totalTVA
  const validDays = quote.validity_days ?? 30

  return (
    <Document
      title={`Devis ${ref}`}
      author={company.name}
      subject={`Devis pour ${client.name}`}
    >
      <Page size="A4" style={s.page}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.companyBlock}>
            <Text style={s.companyName}>{company.name}</Text>
            <Text style={s.companyDetail}>{company.address}</Text>
            <Text style={s.companyDetail}>Tél : {company.phone}</Text>
            <Text style={s.companyDetail}>{company.email}</Text>
            <Text style={s.companyDetail}>SIRET : {company.siret}</Text>
            <Text style={s.companyDetail}>
              TVA : {company.tva}
            </Text>
          </View>
          <View style={s.docBadge}>
            <Text style={s.docLabel}>Devis</Text>
            <Text style={s.docRef}>{ref}</Text>
            <Text style={s.docMeta}>
              Émis le {fmtDate(quote.created_at)}
            </Text>
            <Text style={s.docMeta}>
              Valable jusqu&apos;au {validityDate(quote.created_at, validDays)}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Client & project info ───────────────────────────────────── */}
        <View style={s.metaRow}>
          <View style={s.infoBlock}>
            <Text style={s.blockLabel}>Destinataire</Text>
            <Text style={s.blockValueBold}>{client.name}</Text>
            {client.address ? (
              <Text style={s.blockValueLight}>{client.address}</Text>
            ) : null}
            {client.phone ? (
              <Text style={s.blockValueLight}>{client.phone}</Text>
            ) : null}
            {client.email ? (
              <Text style={s.blockValueLight}>{client.email}</Text>
            ) : null}
          </View>
          <View style={s.infoBlock}>
            <Text style={s.blockLabel}>Objet</Text>
            <Text style={s.blockValue}>{projectTitle}</Text>
          </View>
          <View style={[s.infoBlock, { alignItems: "flex-end" }]}>
            <Text style={s.blockLabel}>Conditions</Text>
            <Text style={s.blockValue}>TVA applicable : {tvaRate} %</Text>
            <Text style={s.blockValue}>Validité : {validDays} jours</Text>
          </View>
        </View>

        {/* ── Items table ─────────────────────────────────────────────── */}
        <View style={s.tableContainer}>
          {/* Header row */}
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.colDesignation]}>
              Désignation
            </Text>
            <Text style={[s.tableHeaderCell, s.colQty]}>Qté</Text>
            <Text style={[s.tableHeaderCell, s.colUnit]}>Unité</Text>
            <Text style={[s.tableHeaderCell, s.colPU]}>P.U. H.T.</Text>
            <Text style={[s.tableHeaderCell, s.colTotal]}>Total H.T.</Text>
          </View>

          {/* Item rows */}
          {quote.items.map((item, i) => {
            const lineTotal = item.quantity * item.unit_price
            const RowStyle = i % 2 === 0 ? s.tableRow : s.tableRowAlt
            return (
              <View key={item.id} style={RowStyle}>
                <View style={[s.colDesignation, { flexDirection: "row" }]}>
                  <Text style={s.rowNum}>
                    {String(i + 1).padStart(2, "0")}.
                  </Text>
                  <Text style={s.tableCell}>{item.label}</Text>
                </View>
                <Text style={[s.tableCellMono, s.colQty]}>
                  {fmtNum(item.quantity)}
                </Text>
                <Text style={[s.tableCellLight, s.colUnit]}>
                  {item.unit ?? "u."}
                </Text>
                <Text style={[s.tableCellMono, s.colPU]}>
                  {fmtEur(item.unit_price)}
                </Text>
                <Text style={[s.tableCellBold, s.colTotal]}>
                  {fmtEur(lineTotal)}
                </Text>
              </View>
            )
          })}
        </View>

        {/* ── Totals ──────────────────────────────────────────────────── */}
        <View style={s.totalsSection}>
          <View style={s.totalsBox}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Total H.T.</Text>
              <Text style={s.totalsValue}>{fmtEur(totalHT)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>TVA ({tvaRate} %)</Text>
              <Text style={s.totalsValue}>{fmtEur(totalTVA)}</Text>
            </View>
            <View style={s.totalsRowFinal}>
              <Text style={s.totalsFinalLabel}>TOTAL T.T.C.</Text>
              <Text style={s.totalsFinalValue}>{fmtEur(totalTTC)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ───────────────────────────────────────────────────── */}
        {quote.notes ? (
          <View style={s.notesSection}>
            <Text style={s.notesLabel}>Notes & conditions particulières</Text>
            <View style={s.notesBox}>
              <Text style={s.notesText}>{quote.notes}</Text>
            </View>
          </View>
        ) : null}

        {/* ── Conditions générales ────────────────────────────────────── */}
        {conditions.length > 0 && (
          <View style={s.conditionsSection}>
            <Text style={s.notesLabel}>Conditions générales</Text>
            {conditions.map((cond, i) => (
              <View key={i} style={s.conditionsRow}>
                <Text style={s.conditionsBullet}>—</Text>
                <Text style={s.conditionsText}>{cond}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Signature area ───────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          {[
            ["Bon pour accord", "Client — date et signature"],
            ["Signature entreprise", company.name],
          ].map(([title, sub]) => (
            <View
              key={title}
              style={{
                width: "44%",
                borderWidth: 1,
                borderColor: PALETTE.rule,
                borderRadius: 2,
                padding: 10,
                height: 60,
              }}
            >
              <Text
                style={{ fontSize: 7.5, color: PALETTE.mid, marginBottom: 2 }}
              >
                {title}
              </Text>
              <Text style={{ fontSize: 7, color: PALETTE.light }}>{sub}</Text>
            </View>
          ))}
        </View>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {company.name} — SIRET {company.siret}
          </Text>
          <Text style={s.footerAccent}>{ref}</Text>
          <Text style={s.footerText}>
            <Text
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} / ${totalPages}`
              }
            />
          </Text>
        </View>
      </Page>
    </Document>
  )
}
