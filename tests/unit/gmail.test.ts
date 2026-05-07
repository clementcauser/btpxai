import { describe, it, expect, vi, beforeEach } from "vitest"
import type { GmailConnection } from "@/types"

// Mock supabaseService avant tout import de lib/gmail
vi.mock("@/lib/supabase/service", () => ({
  supabaseService: { from: vi.fn() },
}))
vi.mock("@/lib/env", () => ({
  env: {
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
  },
}))

// Mock fetch global
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

import { supabaseService } from "@/lib/supabase/service"
import { GmailClient } from "@/lib/gmail"
import { CONNECTION_COLORS } from "@/lib/gmail-colors"

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

const futureDate = new Date(Date.now() + 3600 * 1000).toISOString()

const baseConnection: GmailConnection = {
  id: "conn-1",
  email: "contact@entreprise.fr",
  label: "Contact",
  access_token: "valid-token",
  refresh_token: "refresh-token",
  expires_at: futureDate,
  workspace_id: "ws-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

function mockForConnection(conn: GmailConnection) {
  const builder = makeBuilder({ data: conn, error: null })
  mockSupabase.from.mockReturnValue(builder)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── CONNECTION_COLORS ────────────────────────────────────────────────────────

describe("CONNECTION_COLORS", () => {
  it("exporte un tableau de 6 couleurs hex", () => {
    expect(CONNECTION_COLORS).toHaveLength(6)
    CONNECTION_COLORS.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i))
  })
})

// ─── GmailClient.forConnection ────────────────────────────────────────────────

describe("GmailClient.forConnection", () => {
  it("retourne un GmailClient quand la connexion appartient au workspace", async () => {
    mockForConnection(baseConnection)

    const client = await GmailClient.forConnection("conn-1", "ws-1")
    expect(client.email).toBe("contact@entreprise.fr")
    expect(client.label).toBe("Contact")
    expect(client.connectionId).toBe("conn-1")
  })

  it("lève une erreur si la connexion n'est pas trouvée (mauvais workspace)", async () => {
    const builder = makeBuilder({ data: null, error: null })
    mockSupabase.from.mockReturnValue(builder)

    await expect(GmailClient.forConnection("conn-1", "ws-other")).rejects.toThrow(
      "Connexion Gmail introuvable ou accès refusé"
    )
  })
})

// ─── GmailClient.allForWorkspace ─────────────────────────────────────────────

describe("GmailClient.allForWorkspace", () => {
  it("retourne un tableau vide si aucune connexion", async () => {
    const builder = makeBuilder({ data: [], error: null })
    mockSupabase.from.mockReturnValue(builder)

    const clients = await GmailClient.allForWorkspace("ws-1")
    expect(clients).toHaveLength(0)
  })

  it("retourne un GmailClient par connexion", async () => {
    const conn2: GmailConnection = {
      ...baseConnection,
      id: "conn-2",
      email: "commercial@entreprise.fr",
      label: "Commercial",
    }
    const builder = makeBuilder({ data: [baseConnection, conn2], error: null })
    mockSupabase.from.mockReturnValue(builder)

    const clients = await GmailClient.allForWorkspace("ws-1")
    expect(clients).toHaveLength(2)
    expect(clients[0]!.email).toBe("contact@entreprise.fr")
    expect(clients[1]!.email).toBe("commercial@entreprise.fr")
  })
})

// ─── Token refresh ────────────────────────────────────────────────────────────

describe("GmailClient — gestion du token", () => {
  it("utilise le token en cache s'il n'est pas expiré", async () => {
    mockForConnection(baseConnection)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    })

    const client = await GmailClient.forConnection("conn-1", "ws-1")
    await client.listEmails()

    // Un seul appel fetch (listEmails), pas de refresh
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(String(mockFetch.mock.calls[0]![0])).toContain("gmail.googleapis.com")
  })

  it("rafraîchit le token expiré et met à jour la base", async () => {
    const expiredConn: GmailConnection = {
      ...baseConnection,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    }
    const readBuilder = makeBuilder({ data: expiredConn, error: null })
    const updateBuilder = makeBuilder({ data: null, error: null })
    mockSupabase.from
      .mockReturnValueOnce(readBuilder)
      .mockReturnValueOnce(updateBuilder)

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "new-token", expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [] }),
      })

    const client = await GmailClient.forConnection("conn-1", "ws-1")
    await client.listEmails()

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[0]![0]).toBe("https://oauth2.googleapis.com/token")
  })

  it("lève une erreur si le refresh échoue", async () => {
    const expiredConn: GmailConnection = {
      ...baseConnection,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    }
    mockForConnection(expiredConn)
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) })

    const client = await GmailClient.forConnection("conn-1", "ws-1")
    await expect(client.listEmails()).rejects.toThrow("Échec du refresh token Gmail")
  })
})

// ─── listEmails ───────────────────────────────────────────────────────────────

describe("GmailClient.listEmails", () => {
  it("retourne un tableau vide si aucun message", async () => {
    mockForConnection(baseConnection)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    const client = await GmailClient.forConnection("conn-1", "ws-1")
    expect(await client.listEmails()).toEqual([])
  })

  it("retourne des EmailSummary depuis l'API Gmail", async () => {
    mockForConnection(baseConnection)

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: "msg-1", threadId: "thread-1" }] }),
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

    const client = await GmailClient.forConnection("conn-1", "ws-1")
    const emails = await client.listEmails({ maxResults: 10 })

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
})

// ─── getEmail ─────────────────────────────────────────────────────────────────

describe("GmailClient.getEmail", () => {
  it("retourne un EmailDetail avec body texte brut", async () => {
    mockForConnection(baseConnection)

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
          body: { data: Buffer.from("Corps du message").toString("base64url") },
        },
      }),
    })

    const client = await GmailClient.forConnection("conn-1", "ws-1")
    const email = await client.getEmail("msg-1")
    expect(email.id).toBe("msg-1")
    expect(email.body).toBe("Corps du message")
    expect(email.isRead).toBe(true)
  })

  it("extrait le body HTML d'un message multipart", async () => {
    mockForConnection(baseConnection)

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
            { mimeType: "text/plain", body: { data: Buffer.from("texte brut").toString("base64url") } },
            { mimeType: "text/html", body: { data: Buffer.from("<p>HTML</p>").toString("base64url") } },
          ],
        },
      }),
    })

    const client = await GmailClient.forConnection("conn-1", "ws-1")
    const email = await client.getEmail("msg-2")
    expect(email.body).toBe("<p>HTML</p>")
    expect(email.isRead).toBe(false)
  })
})

// ─── sendEmail ────────────────────────────────────────────────────────────────

describe("GmailClient.sendEmail", () => {
  it("envoie un email via Gmail API avec encodage base64url", async () => {
    mockForConnection(baseConnection)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "sent-1" }) })

    const client = await GmailClient.forConnection("conn-1", "ws-1")
    await client.sendEmail("client@example.com", "Votre devis", "Bonjour,\n\nVeuillez trouver...")

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

    const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as { raw: string }
    const decoded = Buffer.from(callBody.raw, "base64url").toString("utf-8")
    expect(decoded).toContain("To: client@example.com")
    expect(decoded).toContain("Subject: Votre devis")
    expect(decoded).toContain("Bonjour,")
  })

  it("inclut In-Reply-To quand replyToMessageId est fourni", async () => {
    mockForConnection(baseConnection)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "sent-2" }) })

    const client = await GmailClient.forConnection("conn-1", "ws-1")
    await client.sendEmail("a@b.com", "Re: Test", "Réponse", "original-msg-id")

    const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as { raw: string }
    const decoded = Buffer.from(callBody.raw, "base64url").toString("utf-8")
    expect(decoded).toContain("In-Reply-To: original-msg-id")
    expect(decoded).toContain("References: original-msg-id")
  })
})

// ─── markAsRead ───────────────────────────────────────────────────────────────

describe("GmailClient.markAsRead", () => {
  it("appelle Gmail API avec removeLabelIds UNREAD", async () => {
    mockForConnection(baseConnection)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    const client = await GmailClient.forConnection("conn-1", "ws-1")
    await client.markAsRead("msg-1")

    expect(mockFetch).toHaveBeenCalledWith(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/msg-1/modify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
      })
    )
  })
})

// ─── archiveEmail ─────────────────────────────────────────────────────────────

describe("GmailClient.archiveEmail", () => {
  it("supprime les labels INBOX et UNREAD", async () => {
    mockForConnection(baseConnection)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    const client = await GmailClient.forConnection("conn-1", "ws-1")
    await client.archiveEmail("msg-1")

    const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as unknown
    expect(callBody).toEqual({ removeLabelIds: ["INBOX", "UNREAD"] })
  })
})
