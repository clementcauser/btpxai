import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock supabaseService avant tout import de lib/gmail
vi.mock("@/lib/supabase/service", () => ({
  supabaseService: {
    from: vi.fn(),
  },
}))

// Mock fetch global
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

import { supabaseService } from "@/lib/supabase/service"
import { getValidAccessToken } from "@/lib/gmail"

const mockSupabase = supabaseService as {
  from: ReturnType<typeof vi.fn>
}

function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  }
  for (const method of ["select", "update", "eq", "single", "limit", "order", "delete", "insert", "neq"]) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }
  return builder
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getValidAccessToken", () => {
  it("retourne l'access_token existant si non expiré", async () => {
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString()
    const builder = makeBuilder({
      data: {
        id: "conn-1",
        email: "contact@entreprise.fr",
        access_token: "valid-token",
        refresh_token: "refresh-token",
        expires_at: futureDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    })
    mockSupabase.from.mockReturnValue(builder)

    const token = await getValidAccessToken()
    expect(token).toBe("valid-token")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("rafraîchit le token si expiré et retourne le nouveau token", async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString()
    const readBuilder = makeBuilder({
      data: {
        id: "conn-1",
        email: "contact@entreprise.fr",
        access_token: "expired-token",
        refresh_token: "refresh-token-xyz",
        expires_at: pastDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    })
    const updateBuilder = makeBuilder({ data: null, error: null })
    mockSupabase.from
      .mockReturnValueOnce(readBuilder)
      .mockReturnValueOnce(updateBuilder)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "new-access-token",
        expires_in: 3600,
      }),
    })

    const token = await getValidAccessToken()
    expect(token).toBe("new-access-token")
    expect(mockFetch).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("lève une erreur si aucune connexion Gmail en base", async () => {
    const builder = makeBuilder({ data: null, error: null })
    mockSupabase.from.mockReturnValue(builder)

    await expect(getValidAccessToken()).rejects.toThrow(
      "Aucune connexion Gmail configurée"
    )
  })
})
