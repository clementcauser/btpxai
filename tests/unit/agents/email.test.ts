import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  emailCategorySchema,
  emailClassificationSchema,
  emailDraftSchema,
  classifyEmail,
  draftEmailReply,
} from "@/lib/agents/email"

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}))

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mock-model"),
}))

import { generateObject } from "ai"

// ─── Schema: emailCategorySchema ─────────────────────────────────────────────

describe("emailCategorySchema", () => {
  it("accepts demande_devis", () => {
    expect(emailCategorySchema.safeParse("demande_devis").success).toBe(true)
  })

  it("accepts suivi_commande", () => {
    expect(emailCategorySchema.safeParse("suivi_commande").success).toBe(true)
  })

  it("accepts question", () => {
    expect(emailCategorySchema.safeParse("question").success).toBe(true)
  })

  it("accepts autre", () => {
    expect(emailCategorySchema.safeParse("autre").success).toBe(true)
  })

  it("rejects unknown category", () => {
    expect(emailCategorySchema.safeParse("spam").success).toBe(false)
  })

  it("rejects empty string", () => {
    expect(emailCategorySchema.safeParse("").success).toBe(false)
  })
})

// ─── Schema: emailClassificationSchema ───────────────────────────────────────

describe("emailClassificationSchema", () => {
  const validClassification = {
    category: "demande_devis",
    confidence: 0.95,
    reasoning: "Le client demande explicitement un chiffrage.",
  }

  it("accepts a valid classification", () => {
    expect(emailClassificationSchema.safeParse(validClassification).success).toBe(true)
  })

  it("accepts confidence of 0", () => {
    expect(
      emailClassificationSchema.safeParse({ ...validClassification, confidence: 0 }).success
    ).toBe(true)
  })

  it("accepts confidence of 1", () => {
    expect(
      emailClassificationSchema.safeParse({ ...validClassification, confidence: 1 }).success
    ).toBe(true)
  })

  it("rejects confidence above 1", () => {
    expect(
      emailClassificationSchema.safeParse({ ...validClassification, confidence: 1.1 }).success
    ).toBe(false)
  })

  it("rejects confidence below 0", () => {
    expect(
      emailClassificationSchema.safeParse({ ...validClassification, confidence: -0.1 }).success
    ).toBe(false)
  })

  it("rejects empty reasoning", () => {
    expect(
      emailClassificationSchema.safeParse({ ...validClassification, reasoning: "" }).success
    ).toBe(false)
  })

  it("rejects invalid category", () => {
    expect(
      emailClassificationSchema.safeParse({ ...validClassification, category: "unknown" }).success
    ).toBe(false)
  })

  it("rejects missing fields", () => {
    expect(emailClassificationSchema.safeParse({ category: "question" }).success).toBe(false)
  })
})

// ─── Schema: emailDraftSchema ─────────────────────────────────────────────────

describe("emailDraftSchema", () => {
  it("accepts a non-empty draft", () => {
    expect(
      emailDraftSchema.safeParse({ draft: "Bonjour, merci pour votre message." }).success
    ).toBe(true)
  })

  it("rejects an empty draft", () => {
    expect(emailDraftSchema.safeParse({ draft: "" }).success).toBe(false)
  })

  it("rejects missing draft field", () => {
    expect(emailDraftSchema.safeParse({}).success).toBe(false)
  })
})

// ─── classifyEmail ────────────────────────────────────────────────────────────

describe("classifyEmail", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns parsed classification from AI (demande_devis)", async () => {
    const mockOutput = {
      category: "demande_devis",
      confidence: 0.95,
      reasoning: "Le client demande un chiffrage pour une clôture.",
    }
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockOutput } as never)

    const result = await classifyEmail(
      "Demande de devis clôture",
      "Bonjour, je souhaite obtenir un devis pour une clôture en acier."
    )

    expect(result.category).toBe("demande_devis")
    expect(result.confidence).toBe(0.95)
    expect(result.reasoning).toBeTruthy()
  })

  it("returns parsed classification from AI (suivi_commande)", async () => {
    const mockOutput = {
      category: "suivi_commande",
      confidence: 0.88,
      reasoning: "Le client s'enquiert de l'avancement de sa commande.",
    }
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockOutput } as never)

    const result = await classifyEmail(
      "Suivi de ma commande",
      "Bonjour, où en est mon portail commandé il y a 3 semaines ?"
    )

    expect(result.category).toBe("suivi_commande")
  })

  it("returns parsed classification from AI (question)", async () => {
    const mockOutput = {
      category: "question",
      confidence: 0.82,
      reasoning: "Le client pose une question technique.",
    }
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockOutput } as never)

    const result = await classifyEmail(
      "Question technique",
      "Bonjour, travaillez-vous l'inox 316L ?"
    )

    expect(result.category).toBe("question")
  })

  it("returns parsed classification from AI (autre)", async () => {
    const mockOutput = {
      category: "autre",
      confidence: 0.75,
      reasoning: "Email hors sujet.",
    }
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockOutput } as never)

    const result = await classifyEmail("Newsletter", "Découvrez nos offres du mois !")

    expect(result.category).toBe("autre")
  })

  it("calls generateObject with subject and body in the prompt", async () => {
    const mockOutput = {
      category: "question",
      confidence: 0.8,
      reasoning: "Question générale.",
    }
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockOutput } as never)

    const subject = "Horaires d'ouverture"
    const body = "Bonjour, quels sont vos horaires ?"
    await classifyEmail(subject, body)

    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(subject) as string,
      })
    )
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(body) as string,
      })
    )
  })

  it("propagates errors from generateObject", async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error("API unavailable"))

    await expect(classifyEmail("Objet", "Corps")).rejects.toThrow("API unavailable")
  })

  it("propagates AbortError on timeout", async () => {
    const abortErr = Object.assign(new Error("Timeout"), { name: "TimeoutError" })
    vi.mocked(generateObject).mockRejectedValueOnce(abortErr)

    await expect(classifyEmail("Objet", "Corps")).rejects.toMatchObject({
      name: "TimeoutError",
    })
  })
})

// ─── draftEmailReply ──────────────────────────────────────────────────────────

describe("draftEmailReply", () => {
  beforeEach(() => vi.clearAllMocks())

  const mockDraft = {
    draft:
      "Bonjour,\n\nNous avons bien reçu votre demande et reviendrons vers vous rapidement.\n\nCordialement,\nL'équipe BTP",
  }

  it("returns parsed draft from AI", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockDraft } as never)

    const result = await draftEmailReply(
      "Demande de devis portail",
      "Je souhaite un devis pour un portail coulissant.",
      "demande_devis"
    )

    expect(result.draft).toBe(mockDraft.draft)
  })

  it("includes clientName in the prompt when provided", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockDraft } as never)

    await draftEmailReply(
      "Suivi commande",
      "Où en est ma commande ?",
      "suivi_commande",
      "Jean Dupont"
    )

    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Jean Dupont") as string,
      })
    )
  })

  it("does not include clientName in prompt when absent", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockDraft } as never)

    await draftEmailReply("Objet", "Corps", "question")

    const call = vi.mocked(generateObject).mock.calls[0][0] as { prompt: string }
    expect(call.prompt).not.toContain("Client connu")
  })

  it("includes the category label in the prompt", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: mockDraft } as never)

    await draftEmailReply("Objet", "Corps", "demande_devis")

    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("demande de devis") as string,
      })
    )
  })

  it("propagates errors from generateObject", async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error("API unavailable"))

    await expect(
      draftEmailReply("Objet", "Corps", "question")
    ).rejects.toThrow("API unavailable")
  })

  it("propagates AbortError on timeout", async () => {
    const abortErr = Object.assign(new Error("Timeout"), { name: "TimeoutError" })
    vi.mocked(generateObject).mockRejectedValueOnce(abortErr)

    await expect(
      draftEmailReply("Objet", "Corps", "autre")
    ).rejects.toMatchObject({ name: "TimeoutError" })
  })
})
