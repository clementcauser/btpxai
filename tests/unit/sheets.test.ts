import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/service", () => ({
  supabaseService: {
    from: vi.fn(),
  },
}))

vi.mock("@/lib/env", () => ({
  env: {
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    GOOGLE_SHEETS_SPREADSHEET_ID: "test-spreadsheet-id",
  },
}))

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

import { supabaseService } from "@/lib/supabase/service"
import {
  getValidAccessToken,
  syncQuotes,
  syncProjects,
  syncMonthlyRevenue,
  getLastSyncAt,
  syncAllToSheets,
} from "@/lib/sheets"

const mockSupabase = supabaseService as unknown as { from: ReturnType<typeof vi.fn> }

function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  }
  for (const method of [
    "select", "update", "eq", "single", "limit", "order", "delete",
    "insert", "neq", "in", "upsert", "gte",
  ]) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }
  return builder
}

const futureDate = new Date(Date.now() + 3600 * 1000).toISOString()
const pastDate = new Date(Date.now() - 1000).toISOString()

function mockValidConnection(overrides: Record<string, unknown> = {}) {
  return makeBuilder({
    data: {
      id: "conn-1",
      access_token: "valid-token",
      refresh_token: "refresh-token",
      expires_at: futureDate,
      ...overrides,
    },
    error: null,
  })
}

function mockOkSheetsResponse() {
  return { ok: true, text: async () => "", json: async () => ({}) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getValidAccessToken ───────────────────────────────────────────────────────

describe("getValidAccessToken", () => {
  it("retourne le token existant s'il n'est pas expiré", async () => {
    mockSupabase.from.mockReturnValue(mockValidConnection())

    const token = await getValidAccessToken()
    expect(token).toBe("valid-token")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("rafraîchit le token s'il est expiré", async () => {
    const expiredBuilder = makeBuilder({
      data: {
        id: "conn-1",
        access_token: "old-token",
        refresh_token: "refresh-token",
        expires_at: pastDate,
      },
      error: null,
    })
    const updateBuilder = makeBuilder({ data: {}, error: null })
    mockSupabase.from
      .mockReturnValueOnce(expiredBuilder)
      .mockReturnValueOnce(updateBuilder)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "new-token", expires_in: 3600 }),
    })

    const token = await getValidAccessToken()
    expect(token).toBe("new-token")
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it("lève une erreur si aucune connexion n'est configurée", async () => {
    mockSupabase.from.mockReturnValue(makeBuilder({ data: null, error: null }))
    await expect(getValidAccessToken()).rejects.toThrow("Aucune connexion Google")
  })

  it("lève une erreur si le refresh token échoue", async () => {
    const expiredBuilder = makeBuilder({
      data: { id: "conn-1", access_token: "old", refresh_token: "r", expires_at: pastDate },
      error: null,
    })
    mockSupabase.from.mockReturnValue(expiredBuilder)
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) })

    await expect(getValidAccessToken()).rejects.toThrow("Échec du refresh token")
  })
})

// ── syncQuotes ────────────────────────────────────────────────────────────────

describe("syncQuotes", () => {
  it("vide puis écrit les données de devis", async () => {
    const quotesBuilder = makeBuilder({
      data: [
        {
          reference: "DEV-2026-001",
          status: "sent",
          total_ht: 1500.5,
          created_at: "2026-01-15T10:00:00Z",
          sent_at: "2026-01-16T08:00:00Z",
          project: { title: "Portail", client: { name: "Dupont SA" } },
        },
        {
          reference: "DEV-2026-002",
          status: "accepted",
          total_ht: 3200,
          created_at: "2026-02-01T09:00:00Z",
          sent_at: null,
          project: { title: "Garde-corps", client: { name: "Martin" } },
        },
      ],
      error: null,
    })
    mockSupabase.from.mockReturnValue(quotesBuilder)

    mockFetch
      .mockResolvedValueOnce(mockOkSheetsResponse()) // clear
      .mockResolvedValueOnce(mockOkSheetsResponse()) // write

    const result = await syncQuotes("token-abc", "spreadsheet-id")

    expect(result.status).toBe("success")
    expect(result.sheet).toBe("Devis")
    expect(result.rowCount).toBe(2)

    // clear call
    expect(mockFetch.mock.calls[0][0]).toContain(":clear")
    // write call includes the spreadsheet id
    const writeParsed = JSON.parse(mockFetch.mock.calls[1][1]?.body as string)
    expect(writeParsed.values[0]).toEqual(["Référence", "Client", "Montant HT (€)", "Statut", "Date création", "Date envoi"])
    expect(writeParsed.values[1][0]).toBe("DEV-2026-001")
    expect(writeParsed.values[1][1]).toBe("Dupont SA")
    expect(writeParsed.values[1][3]).toBe("Envoyé")
  })

  it("retourne une erreur si la requête Supabase échoue", async () => {
    mockSupabase.from.mockReturnValue(makeBuilder({ data: null, error: { message: "DB error" } }))

    const result = await syncQuotes("token", "id")
    expect(result.status).toBe("error")
    expect(result.error).toBe("DB error")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("retourne une erreur si l'appel Sheets échoue", async () => {
    mockSupabase.from.mockReturnValue(makeBuilder({ data: [], error: null }))
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => "Forbidden" })

    const result = await syncQuotes("token", "id")
    expect(result.status).toBe("error")
    expect(result.error).toContain("Devis")
  })

  it("formate les montants à 2 décimales", async () => {
    mockSupabase.from.mockReturnValue(
      makeBuilder({
        data: [{ reference: "R1", status: "draft", total_ht: 999.999, created_at: "2026-01-01T00:00:00Z", sent_at: null, project: null }],
        error: null,
      })
    )
    mockFetch
      .mockResolvedValueOnce(mockOkSheetsResponse())
      .mockResolvedValueOnce(mockOkSheetsResponse())

    await syncQuotes("token", "id")

    const body = JSON.parse(mockFetch.mock.calls[1][1]?.body as string)
    expect(body.values[1][2]).toBe("1000.00")
  })
})

// ── syncProjects ──────────────────────────────────────────────────────────────

describe("syncProjects", () => {
  it("écrit uniquement les projets planned et in_progress", async () => {
    mockSupabase.from.mockReturnValue(
      makeBuilder({
        data: [
          { title: "Portail", status: "in_progress", created_at: "2026-01-01T00:00:00Z", client: { name: "Dupont" } },
          { title: "Garde-corps", status: "planned", created_at: "2026-02-01T00:00:00Z", client: null },
        ],
        error: null,
      })
    )
    mockFetch
      .mockResolvedValueOnce(mockOkSheetsResponse())
      .mockResolvedValueOnce(mockOkSheetsResponse())

    const result = await syncProjects("token", "id")

    expect(result.status).toBe("success")
    expect(result.rowCount).toBe(2)

    const body = JSON.parse(mockFetch.mock.calls[1][1]?.body as string)
    expect(body.values[0]).toEqual(["Titre", "Client", "Statut", "Date création"])
    expect(body.values[1][0]).toBe("Portail")
    expect(body.values[1][1]).toBe("Dupont")
    expect(body.values[1][2]).toBe("En cours")
    expect(body.values[2][1]).toBe("")
  })

  it("retourne une erreur si la requête Supabase échoue", async () => {
    mockSupabase.from.mockReturnValue(makeBuilder({ data: null, error: { message: "timeout" } }))

    const result = await syncProjects("token", "id")
    expect(result.status).toBe("error")
  })
})

// ── syncMonthlyRevenue ────────────────────────────────────────────────────────

describe("syncMonthlyRevenue", () => {
  it("agrège le CA par mois et écrit les 12 derniers mois", async () => {
    mockSupabase.from.mockReturnValue(
      makeBuilder({
        data: [
          { status: "accepted", total_ht: 1000, created_at: "2026-01-10T00:00:00Z" },
          { status: "accepted", total_ht: 500, created_at: "2026-01-20T00:00:00Z" },
          { status: "sent", total_ht: 800, created_at: "2026-01-25T00:00:00Z" },
          { status: "draft", total_ht: 200, created_at: "2026-02-01T00:00:00Z" },
        ],
        error: null,
      })
    )
    mockFetch
      .mockResolvedValueOnce(mockOkSheetsResponse())
      .mockResolvedValueOnce(mockOkSheetsResponse())

    const result = await syncMonthlyRevenue("token", "id")

    expect(result.status).toBe("success")

    const body = JSON.parse(mockFetch.mock.calls[1][1]?.body as string)
    expect(body.values[0]).toEqual(["Mois", "CA Réalisé HT (€)", "Nb devis acceptés", "Nb devis envoyés"])

    // Janvier 2026: CA = 1500, acceptés = 2, envoyés = 1
    const janRow = body.values.find((r: unknown[]) => String(r[0]).toLowerCase().includes("janv"))
    expect(janRow).toBeDefined()
    expect(janRow[1]).toBe("1500.00")
    expect(janRow[2]).toBe(2)
    expect(janRow[3]).toBe(1)
  })

  it("retourne une erreur si la requête Supabase échoue", async () => {
    mockSupabase.from.mockReturnValue(makeBuilder({ data: null, error: { message: "DB fail" } }))

    const result = await syncMonthlyRevenue("token", "id")
    expect(result.status).toBe("error")
  })
})

// ── getLastSyncAt ─────────────────────────────────────────────────────────────

describe("getLastSyncAt", () => {
  it("retourne la valeur si elle existe", async () => {
    mockSupabase.from.mockReturnValue(
      makeBuilder({ data: { value: "2026-01-01T06:00:00.000Z" }, error: null })
    )

    const result = await getLastSyncAt()
    expect(result).toBe("2026-01-01T06:00:00.000Z")
  })

  it("retourne null si aucune valeur", async () => {
    mockSupabase.from.mockReturnValue(makeBuilder({ data: null, error: null }))

    const result = await getLastSyncAt()
    expect(result).toBeNull()
  })
})

// ── syncAllToSheets ───────────────────────────────────────────────────────────

describe("syncAllToSheets", () => {
  it("retourne hasError false quand toutes les syncs réussissent", async () => {
    // getValidAccessToken: valid connection
    const connBuilder = mockValidConnection()
    // syncQuotes: quotes data
    const quotesBuilder = makeBuilder({ data: [], error: null })
    // syncProjects: projects data
    const projectsBuilder = makeBuilder({ data: [], error: null })
    // syncMonthlyRevenue: quotes data
    const revenueBuilder = makeBuilder({ data: [], error: null })
    // setLastSyncAt: upsert
    const upsertBuilder = makeBuilder({ data: {}, error: null })

    mockSupabase.from
      .mockReturnValueOnce(connBuilder)     // getValidAccessToken
      .mockReturnValueOnce(quotesBuilder)   // syncQuotes → supabase
      .mockReturnValueOnce(projectsBuilder) // syncProjects → supabase
      .mockReturnValueOnce(revenueBuilder)  // syncMonthlyRevenue → supabase
      .mockReturnValueOnce(upsertBuilder)   // setLastSyncAt

    // 6 fetch calls: clear + write for each of the 3 sheets
    mockFetch.mockResolvedValue(mockOkSheetsResponse())

    const { hasError, results } = await syncAllToSheets()

    expect(hasError).toBe(false)
    expect(results).toHaveLength(3)
    expect(results.every((r) => r.status === "success")).toBe(true)
  })

  it("retourne hasError true si au moins une sync échoue", async () => {
    const connBuilder = mockValidConnection()
    const quotesBuilder = makeBuilder({ data: null, error: { message: "DB error" } })
    const projectsBuilder = makeBuilder({ data: [], error: null })
    const revenueBuilder = makeBuilder({ data: [], error: null })

    mockSupabase.from
      .mockReturnValueOnce(connBuilder)
      .mockReturnValueOnce(quotesBuilder)
      .mockReturnValueOnce(projectsBuilder)
      .mockReturnValueOnce(revenueBuilder)

    mockFetch.mockResolvedValue(mockOkSheetsResponse())

    const { hasError, results } = await syncAllToSheets()

    expect(hasError).toBe(true)
    const devisResult = results.find((r) => r.sheet === "Devis")
    expect(devisResult?.status).toBe("error")
  })
})
