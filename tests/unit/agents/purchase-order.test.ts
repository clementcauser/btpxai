import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  purchaseOrderItemSchema,
  purchaseOrderExtractionSchema,
  isSupportedMimeType,
  SUPPORTED_ATTACHMENT_MIME_TYPES,
  extractPurchaseOrder,
} from "@/lib/agents/purchase-order"

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}))

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mock-model"),
}))

import { generateObject } from "ai"

// ─── isSupportedMimeType ─────────────────────────────────────────────────────

describe("isSupportedMimeType", () => {
  it("accepts application/pdf", () => {
    expect(isSupportedMimeType("application/pdf")).toBe(true)
  })

  it("accepts image/jpeg", () => {
    expect(isSupportedMimeType("image/jpeg")).toBe(true)
  })

  it("accepts image/png", () => {
    expect(isSupportedMimeType("image/png")).toBe(true)
  })

  it("accepts image/gif", () => {
    expect(isSupportedMimeType("image/gif")).toBe(true)
  })

  it("accepts image/webp", () => {
    expect(isSupportedMimeType("image/webp")).toBe(true)
  })

  it("rejects image/tiff", () => {
    expect(isSupportedMimeType("image/tiff")).toBe(false)
  })

  it("rejects application/msword", () => {
    expect(isSupportedMimeType("application/msword")).toBe(false)
  })

  it("rejects empty string", () => {
    expect(isSupportedMimeType("")).toBe(false)
  })

  it("matches all entries in SUPPORTED_ATTACHMENT_MIME_TYPES", () => {
    for (const mime of SUPPORTED_ATTACHMENT_MIME_TYPES) {
      expect(isSupportedMimeType(mime)).toBe(true)
    }
  })
})

// ─── purchaseOrderItemSchema ──────────────────────────────────────────────────

describe("purchaseOrderItemSchema", () => {
  const validItem = { label: "Portail coulissant", quantity: 1, unit: "u", unit_price: 2500 }

  it("accepts a valid item", () => {
    expect(purchaseOrderItemSchema.safeParse(validItem).success).toBe(true)
  })

  it("accepts null unit_price", () => {
    expect(
      purchaseOrderItemSchema.safeParse({ ...validItem, unit_price: null }).success
    ).toBe(true)
  })

  it("accepts zero unit_price", () => {
    expect(
      purchaseOrderItemSchema.safeParse({ ...validItem, unit_price: 0 }).success
    ).toBe(true)
  })

  it("rejects empty label", () => {
    expect(
      purchaseOrderItemSchema.safeParse({ ...validItem, label: "" }).success
    ).toBe(false)
  })

  it("rejects zero quantity", () => {
    expect(
      purchaseOrderItemSchema.safeParse({ ...validItem, quantity: 0 }).success
    ).toBe(false)
  })

  it("rejects negative quantity", () => {
    expect(
      purchaseOrderItemSchema.safeParse({ ...validItem, quantity: -1 }).success
    ).toBe(false)
  })

  it("rejects negative unit_price", () => {
    expect(
      purchaseOrderItemSchema.safeParse({ ...validItem, unit_price: -10 }).success
    ).toBe(false)
  })

  it("rejects empty unit", () => {
    expect(
      purchaseOrderItemSchema.safeParse({ ...validItem, unit: "" }).success
    ).toBe(false)
  })
})

// ─── purchaseOrderExtractionSchema ───────────────────────────────────────────

describe("purchaseOrderExtractionSchema", () => {
  const validExtraction = {
    client_name: "Entreprise Dupont",
    client_email: "contact@dupont.fr",
    client_phone: "01 23 45 67 89",
    client_address: "12 rue de la Paix, 75001 Paris",
    order_reference: "BC-2024-0042",
    order_date: "2024-05-15",
    delivery_deadline: "2024-06-30",
    items: [
      { label: "Portail coulissant", quantity: 1, unit: "u", unit_price: 2500 },
      { label: "Main d'œuvre pose", quantity: 8, unit: "h", unit_price: 55 },
    ],
    total_ht: 2940,
    notes: "Livraison sur site avec grue",
    confidence: 0.92,
  }

  it("accepts a complete valid extraction", () => {
    expect(purchaseOrderExtractionSchema.safeParse(validExtraction).success).toBe(true)
  })

  it("accepts all nullable fields as null", () => {
    const minimal = {
      client_name: null,
      client_email: null,
      client_phone: null,
      client_address: null,
      order_reference: null,
      order_date: null,
      delivery_deadline: null,
      items: [{ label: "Travaux", quantity: 1, unit: "forfait", unit_price: null }],
      total_ht: null,
      notes: null,
      confidence: 0.3,
    }
    expect(purchaseOrderExtractionSchema.safeParse(minimal).success).toBe(true)
  })

  it("rejects empty items array", () => {
    expect(
      purchaseOrderExtractionSchema.safeParse({ ...validExtraction, items: [] }).success
    ).toBe(false)
  })

  it("rejects confidence above 1", () => {
    expect(
      purchaseOrderExtractionSchema.safeParse({ ...validExtraction, confidence: 1.1 }).success
    ).toBe(false)
  })

  it("rejects confidence below 0", () => {
    expect(
      purchaseOrderExtractionSchema.safeParse({ ...validExtraction, confidence: -0.1 }).success
    ).toBe(false)
  })

  it("rejects negative total_ht", () => {
    expect(
      purchaseOrderExtractionSchema.safeParse({ ...validExtraction, total_ht: -100 }).success
    ).toBe(false)
  })

  it("rejects missing confidence", () => {
    const { confidence: _, ...rest } = validExtraction
    expect(purchaseOrderExtractionSchema.safeParse(rest).success).toBe(false)
  })
})

// ─── extractPurchaseOrder ─────────────────────────────────────────────────────

describe("extractPurchaseOrder", () => {
  beforeEach(() => vi.clearAllMocks())

  const mockBuffer = Buffer.from("fake-pdf-content")

  const mockOutput = {
    client_name: "Bâtiment Martin",
    client_email: "martin@batiment.fr",
    client_phone: "04 56 78 90 12",
    client_address: "5 allée des Chênes, 69000 Lyon",
    order_reference: "BC-2024-0099",
    order_date: "2024-04-10",
    delivery_deadline: "2024-05-31",
    items: [
      { label: "Garde-corps inox", quantity: 12, unit: "ml", unit_price: 180 },
      { label: "Main d'œuvre soudure", quantity: 16, unit: "h", unit_price: 55 },
    ],
    total_ht: 3040,
    notes: "Chantier en cours — accès restreint le matin",
    confidence: 0.88,
  }

  it("returns parsed extraction from AI (PDF)", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockOutput } as never)

    const result = await extractPurchaseOrder(mockBuffer, "application/pdf")

    expect(result.client_name).toBe("Bâtiment Martin")
    expect(result.order_reference).toBe("BC-2024-0099")
    expect(result.items).toHaveLength(2)
    expect(result.items[0].label).toBe("Garde-corps inox")
    expect(result.confidence).toBe(0.88)
  })

  it("returns parsed extraction from AI (image/jpeg)", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockOutput } as never)

    const result = await extractPurchaseOrder(mockBuffer, "image/jpeg")

    expect(result.items).toHaveLength(2)
  })

  it("calls generateObject with messages containing file content for PDF", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockOutput } as never)

    await extractPurchaseOrder(mockBuffer, "application/pdf")

    const call = vi.mocked(generateObject).mock.calls[0][0] as {
      messages: { role: string; content: unknown[] }[]
    }
    expect(call.messages).toBeDefined()
    expect(call.messages[0].role).toBe("user")
    const content = call.messages[0].content as { type: string }[]
    expect(content.some((c) => c.type === "file")).toBe(true)
  })

  it("calls generateObject with messages containing image content for JPEG", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockOutput } as never)

    await extractPurchaseOrder(mockBuffer, "image/jpeg")

    const call = vi.mocked(generateObject).mock.calls[0][0] as {
      messages: { role: string; content: unknown[] }[]
    }
    const content = call.messages[0].content as { type: string }[]
    expect(content.some((c) => c.type === "image")).toBe(true)
  })

  it("propagates errors from generateObject", async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error("API unavailable"))

    await expect(extractPurchaseOrder(mockBuffer, "application/pdf")).rejects.toThrow(
      "API unavailable"
    )
  })

  it("propagates AbortError on timeout", async () => {
    const abortErr = Object.assign(new Error("Timeout"), { name: "TimeoutError" })
    vi.mocked(generateObject).mockRejectedValueOnce(abortErr)

    await expect(extractPurchaseOrder(mockBuffer, "application/pdf")).rejects.toMatchObject({
      name: "TimeoutError",
    })
  })

  it("handles low-confidence extraction (confidence near 0)", async () => {
    const lowConfidenceOutput = {
      ...mockOutput,
      client_name: null,
      items: [{ label: "Inconnu", quantity: 1, unit: "u", unit_price: null }],
      confidence: 0.1,
    }
    vi.mocked(generateObject).mockResolvedValueOnce({ object: lowConfidenceOutput } as never)

    const result = await extractPurchaseOrder(mockBuffer, "application/pdf")

    expect(result.confidence).toBe(0.1)
    expect(result.client_name).toBeNull()
  })
})
