import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  quoteGenerationOutputSchema,
  generatedQuoteItemSchema,
  generateQuoteItems,
} from "@/lib/agents/devis"

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}))

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mock-model"),
}))

import { generateObject } from "ai"

// ─── Schema: generatedQuoteItemSchema ────────────────────────────────────────

describe("generatedQuoteItemSchema", () => {
  it("accepts a valid item", () => {
    const result = generatedQuoteItemSchema.safeParse({
      label: "Fourniture acier S235",
      quantity: 12,
      unit: "ml",
      unit_price: 45,
    })
    expect(result.success).toBe(true)
  })

  it("accepts zero unit_price (forfait inclus dans autre ligne)", () => {
    const result = generatedQuoteItemSchema.safeParse({
      label: "Fourniture incluse",
      quantity: 1,
      unit: "forfait",
      unit_price: 0,
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty label", () => {
    const result = generatedQuoteItemSchema.safeParse({
      label: "",
      quantity: 1,
      unit: "ml",
      unit_price: 45,
    })
    expect(result.success).toBe(false)
  })

  it("rejects zero quantity", () => {
    const result = generatedQuoteItemSchema.safeParse({
      label: "Acier",
      quantity: 0,
      unit: "ml",
      unit_price: 45,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative quantity", () => {
    const result = generatedQuoteItemSchema.safeParse({
      label: "Acier",
      quantity: -2,
      unit: "ml",
      unit_price: 45,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative unit_price", () => {
    const result = generatedQuoteItemSchema.safeParse({
      label: "Acier",
      quantity: 1,
      unit: "ml",
      unit_price: -10,
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty unit", () => {
    const result = generatedQuoteItemSchema.safeParse({
      label: "Acier",
      quantity: 1,
      unit: "",
      unit_price: 45,
    })
    expect(result.success).toBe(false)
  })
})

// ─── Schema: quoteGenerationOutputSchema ─────────────────────────────────────

describe("quoteGenerationOutputSchema", () => {
  const validOutput = {
    items: [
      { label: "Fourniture acier S235", quantity: 12, unit: "ml", unit_price: 45 },
    ],
    notes: "Prix indicatifs, à confirmer selon cours de l'acier",
  }

  it("accepts valid output", () => {
    const result = quoteGenerationOutputSchema.safeParse(validOutput)
    expect(result.success).toBe(true)
  })

  it("accepts multiple items", () => {
    const result = quoteGenerationOutputSchema.safeParse({
      items: [
        { label: "Acier S235", quantity: 10, unit: "ml", unit_price: 50 },
        { label: "Main d'œuvre soudure", quantity: 8, unit: "h", unit_price: 55 },
        { label: "Galvanisation", quantity: 120, unit: "kg", unit_price: 3 },
      ],
      notes: "Devis valable 30 jours",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty items array", () => {
    const result = quoteGenerationOutputSchema.safeParse({
      items: [],
      notes: "Aucun item",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing notes", () => {
    const result = quoteGenerationOutputSchema.safeParse({
      items: [{ label: "Acier", quantity: 1, unit: "ml", unit_price: 45 }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing items", () => {
    const result = quoteGenerationOutputSchema.safeParse({
      notes: "Pas d'items",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid item inside the array", () => {
    const result = quoteGenerationOutputSchema.safeParse({
      items: [{ label: "Acier", quantity: -1, unit: "ml", unit_price: 45 }],
      notes: "Test",
    })
    expect(result.success).toBe(false)
  })
})

// ─── generateQuoteItems ───────────────────────────────────────────────────────

describe("generateQuoteItems", () => {
  beforeEach(() => vi.clearAllMocks())

  const mockOutput = {
    items: [
      { label: "Fourniture acier S235", quantity: 12, unit: "ml", unit_price: 45 },
      { label: "Main d'œuvre soudure", quantity: 8, unit: "h", unit_price: 55 },
    ],
    notes: "Prix indicatifs, à confirmer selon cours de l'acier",
  }

  it("returns parsed items and notes from AI", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockOutput,
    } as never)

    const result = await generateQuoteItems("Portail coulissant 4m en acier S235")

    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toEqual({
      label: "Fourniture acier S235",
      quantity: 12,
      unit: "ml",
      unit_price: 45,
    })
    expect(result.notes).toBe(
      "Prix indicatifs, à confirmer selon cours de l'acier"
    )
  })

  it("calls generateObject with the brief as prompt", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockOutput,
    } as never)

    const brief = "Escalier métallique 1/4 tournant, 12 marches, acier laqué"
    await generateQuoteItems(brief)

    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: brief })
    )
  })

  it("propagates errors from generateObject", async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error("API unavailable"))

    await expect(
      generateQuoteItems("Brief quelconque")
    ).rejects.toThrow("API unavailable")
  })

  it("propagates AbortError on timeout", async () => {
    const abortErr = Object.assign(new Error("Timeout"), { name: "TimeoutError" })
    vi.mocked(generateObject).mockRejectedValueOnce(abortErr)

    await expect(
      generateQuoteItems("Brief quelconque")
    ).rejects.toMatchObject({ name: "TimeoutError" })
  })
})
