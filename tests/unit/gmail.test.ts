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
import { getValidAccessToken, listEmails, getEmail, sendEmail, markAsRead } from "@/lib/gmail"

const mockSupabase = supabaseService as unknown as {
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

// Helper : simule getValidAccessToken (token valide, pas de refresh)
function mockValidToken() {
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
}

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

describe("listEmails", () => {
  it("retourne une liste d'EmailSummary", async () => {
    mockValidToken()

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: "msg-1", threadId: "thread-1" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "msg-1",
          threadId: "thread-1",
          labelIds: ["INBOX", "UNREAD"],
          snippet: "Bonjour, j'aimerais un devis...",
          payload: {
            headers: [
              { name: "Subject", value: "Demande de devis" },
              { name: "From", value: "Jean Dupont <jean@example.com>" },
              { name: "Date", value: "Mon, 28 Apr 2026 10:00:00 +0200" },
            ],
          },
        }),
      })

    const emails = await listEmails({ maxResults: 10 })

    expect(emails).toHaveLength(1)
    expect(emails[0]).toEqual({
      id: "msg-1",
      threadId: "thread-1",
      subject: "Demande de devis",
      from: "Jean Dupont <jean@example.com>",
      date: "Mon, 28 Apr 2026 10:00:00 +0200",
      snippet: "Bonjour, j'aimerais un devis...",
      isRead: false,
    })
  })

  it("retourne un tableau vide si aucun message", async () => {
    mockValidToken()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const emails = await listEmails()
    expect(emails).toEqual([])
  })
})

describe("getEmail", () => {
  it("retourne un EmailDetail avec body texte brut", async () => {
    mockValidToken()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "msg-1",
        threadId: "thread-1",
        labelIds: ["INBOX"],
        snippet: "Bonjour...",
        payload: {
          mimeType: "text/plain",
          headers: [
            { name: "Subject", value: "Test" },
            { name: "From", value: "jean@example.com" },
            { name: "Date", value: "Mon, 28 Apr 2026 10:00:00 +0200" },
          ],
          body: {
            data: Buffer.from("Corps du message").toString("base64url"),
          },
        },
      }),
    })

    const email = await getEmail("msg-1")
    expect(email.id).toBe("msg-1")
    expect(email.body).toBe("Corps du message")
    expect(email.isRead).toBe(true)
  })

  it("retourne le body HTML depuis un message multipart", async () => {
    mockValidToken()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "msg-2",
        threadId: "thread-2",
        labelIds: ["INBOX", "UNREAD"],
        snippet: "...",
        payload: {
          mimeType: "multipart/alternative",
          headers: [
            { name: "Subject", value: "Multipart" },
            { name: "From", value: "a@b.com" },
            { name: "Date", value: "Mon, 28 Apr 2026 10:00:00 +0200" },
          ],
          parts: [
            {
              mimeType: "text/plain",
              body: { data: Buffer.from("texte brut").toString("base64url") },
            },
            {
              mimeType: "text/html",
              body: { data: Buffer.from("<p>HTML</p>").toString("base64url") },
            },
          ],
        },
      }),
    })

    const email = await getEmail("msg-2")
    expect(email.body).toBe("<p>HTML</p>")
    expect(email.isRead).toBe(false)
  })
})

describe("sendEmail", () => {
  it("envoie un email via Gmail API avec encodage base64url", async () => {
    mockValidToken()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "sent-1" }) })

    await sendEmail("client@example.com", "Votre devis", "Bonjour,\n\nVeuillez trouver...")

    expect(mockFetch).toHaveBeenCalledWith(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer valid-token",
          "Content-Type": "application/json",
        }),
      })
    )

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    const decoded = Buffer.from(callBody.raw, "base64url").toString("utf-8")
    expect(decoded).toContain("To: client@example.com")
    expect(decoded).toContain("Subject: Votre devis")
    expect(decoded).toContain("Bonjour,")
  })

  it("inclut In-Reply-To quand replyToMessageId est fourni", async () => {
    mockValidToken()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "sent-2" }) })

    await sendEmail("a@b.com", "Re: Test", "Réponse", "original-msg-id")

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    const decoded = Buffer.from(callBody.raw, "base64url").toString("utf-8")
    expect(decoded).toContain("In-Reply-To: original-msg-id")
    expect(decoded).toContain("References: original-msg-id")
  })
})

describe("markAsRead", () => {
  it("appelle Gmail API avec removeLabelIds UNREAD", async () => {
    mockValidToken()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    await markAsRead("msg-1")

    expect(mockFetch).toHaveBeenCalledWith(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/msg-1/modify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
      })
    )
  })
})
