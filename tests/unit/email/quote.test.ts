import { describe, it, expect } from "vitest"
import { buildQuoteEmailHtml, buildQuoteEmailSubject } from "@/lib/email/quote"
import type { QuoteWithContext } from "@/types"
import type { CompanyInfo } from "@/lib/settings"

const mockCompany: CompanyInfo = {
  name: "Acier Forge SAS",
  address: "12 rue de la Forge, 75001 Paris",
  phone: "01 23 45 67 89",
  email: "contact@acierforge.fr",
  siret: "123 456 789 00010",
  tva: "FR12 123456789",
}

const mockQuote: QuoteWithContext = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  project_id: "p1",
  status: "draft",
  total_ht: 1500,
  tva_rate: 20,
  notes: null,
  validity_days: 30,
  reference: "DEV-2026-001",
  created_at: "2026-04-27T00:00:00Z",
  sent_at: null,
  items: [
    {
      id: "i1",
      quote_id: "550e8400-e29b-41d4-a716-446655440000",
      label: "Cornière acier S235",
      quantity: 10,
      unit_price: 150,
      unit: "ml",
    },
  ],
  project: {
    id: "p1",
    client_id: "c1",
    title: "Portail acier sur mesure",
    description: null,
    status: "in_progress",
    created_at: "2026-04-27T00:00:00Z",
    client: {
      id: "c1",
      name: "Jean Dupont",
      email: "jean.dupont@example.com",
      phone: null,
      address: null,
      created_at: "2026-04-27T00:00:00Z",
    },
  },
}

// ─── buildQuoteEmailSubject ───────────────────────────────────────────────────

describe("buildQuoteEmailSubject", () => {
  it("includes the quote reference", () => {
    expect(buildQuoteEmailSubject(mockQuote, mockCompany)).toContain("DEV-2026-001")
  })

  it("falls back to generated reference when reference is null", () => {
    const q = { ...mockQuote, reference: null }
    const subject = buildQuoteEmailSubject(q, mockCompany)
    expect(subject).toContain("DEV-")
    expect(subject).toContain(q.id.slice(0, 8).toUpperCase())
  })
})

// ─── buildQuoteEmailHtml ──────────────────────────────────────────────────────

describe("buildQuoteEmailHtml", () => {
  it("includes client name", () => {
    const html = buildQuoteEmailHtml(mockQuote, mockCompany)
    expect(html).toContain("Jean Dupont")
  })

  it("includes quote reference", () => {
    const html = buildQuoteEmailHtml(mockQuote, mockCompany)
    expect(html).toContain("DEV-2026-001")
  })

  it("includes formatted total HT", () => {
    const html = buildQuoteEmailHtml(mockQuote, mockCompany)
    // fr-FR uses narrow no-break space (U+202F) as thousands separator
    expect(html).toContain("500,00")
  })

  it("includes formatted total TTC with TVA applied", () => {
    const html = buildQuoteEmailHtml(mockQuote, mockCompany)
    // 1500 * 1.20 = 1800
    expect(html).toContain("800,00")
  })

  it("includes validity period", () => {
    const html = buildQuoteEmailHtml(mockQuote, mockCompany)
    expect(html).toContain("30 jours")
  })

  it("includes project title", () => {
    const html = buildQuoteEmailHtml(mockQuote, mockCompany)
    expect(html).toContain("Portail acier sur mesure")
  })

  it("includes TVA rate", () => {
    const html = buildQuoteEmailHtml(mockQuote, mockCompany)
    expect(html).toContain("20 %")
  })

  it("uses generated reference when reference is null", () => {
    const q = { ...mockQuote, reference: null }
    const html = buildQuoteEmailHtml(q, mockCompany)
    expect(html).toContain("DEV-550E8400")
  })

  it("falls back to 'vos travaux' when project title is empty", () => {
    const q = {
      ...mockQuote,
      project: { ...mockQuote.project, title: "" },
    }
    const html = buildQuoteEmailHtml(q, mockCompany)
    expect(html).toContain("vos travaux")
  })
})
