# Gmail Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connecter la boîte mail d'entreprise via Gmail API OAuth2, exposer 4 fonctions dans `lib/gmail.ts`, et créer la page Inbox + section Paramètres.

**Architecture:** Une table `gmail_connections` stocke les tokens OAuth2 d'une seule boîte d'entreprise. Un helper `getValidAccessToken()` dans `lib/gmail.ts` gère le refresh automatique avant chaque appel. Les routes `/api/gmail/auth` et `/api/gmail/callback` gèrent le flow OAuth2. La page `/inbox` charge les emails en RSC, avec des Client Components pour l'interaction.

**Tech Stack:** Next.js 15 App Router, Supabase (service role), Better-Auth (auth check), raw `fetch` vers Gmail API v1, Vitest pour les tests.

---

## File Map

**Créer :**
- `supabase/migrations/20260429000007_gmail_connections.sql`
- `lib/gmail.ts`
- `tests/unit/gmail.test.ts`
- `app/api/gmail/auth/route.ts`
- `app/api/gmail/callback/route.ts`
- `app/(bureau)/inbox/page.tsx`
- `app/(bureau)/parametres/page.tsx`
- `components/inbox/email-list.tsx`
- `components/inbox/email-detail.tsx`
- `components/inbox/gmail-connection-banner.tsx`
- `components/parametres/gmail-connection-section.tsx`

**Modifier :**
- `types/index.ts` — ajouter types Gmail
- `vitest.config.ts` — ajouter les env vars manquantes pour les tests

---

### Task 1 : Migration DB + env vars de test

**Files:**
- Create: `supabase/migrations/20260429000007_gmail_connections.sql`
- Modify: `vitest.config.ts`

- [ ] **Step 1 : Créer la migration**

Créer `supabase/migrations/20260429000007_gmail_connections.sql` :

```sql
create table public.gmail_connections (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.gmail_connections enable row level security;

create policy "bureau and admin can select gmail_connections"
  on public.gmail_connections for select
  using (auth.uid() is not null);

create policy "bureau and admin can insert gmail_connections"
  on public.gmail_connections for insert
  with check (auth.uid() is not null);

create policy "bureau and admin can update gmail_connections"
  on public.gmail_connections for update
  using (auth.uid() is not null);

create policy "bureau and admin can delete gmail_connections"
  on public.gmail_connections for delete
  using (auth.uid() is not null);
```

- [ ] **Step 2 : Appliquer la migration en local**

```bash
npm run db:reset
```

Résultat attendu : la migration s'applique sans erreur.

- [ ] **Step 3 : Ajouter les env vars manquantes dans vitest.config.ts**

Dans `vitest.config.ts`, compléter le bloc `env` :

```ts
env: {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7W9oHQFQRFHE2VIFxSDAoJyGo0k7VCsxhC4",
  SUPABASE_SERVICE_ROLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  ANTHROPIC_API_KEY: "test-anthropic-key",
  BETTER_AUTH_SECRET: "test-better-auth-secret-32-chars-min",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  RESEND_API_KEY: "test-resend-key",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
},
```

- [ ] **Step 4 : Vérifier que les tests existants passent toujours**

```bash
npm run test:run
```

Résultat attendu : tous les tests existants passent.

- [ ] **Step 5 : Commit**

```bash
git add supabase/migrations/20260429000007_gmail_connections.sql vitest.config.ts
git commit -m "feat: migration table gmail_connections + env vars vitest"
```

---

### Task 2 : Types Gmail dans `types/index.ts`

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1 : Ajouter les types Gmail à la fin de `types/index.ts`**

```ts
export type GmailConnection = {
  id: string
  email: string
  access_token: string
  refresh_token: string
  expires_at: string
  created_at: string
  updated_at: string
}

export type EmailSummary = {
  id: string
  threadId: string
  subject: string
  from: string
  date: string
  snippet: string
  isRead: boolean
}

export type EmailDetail = EmailSummary & {
  body: string
}
```

- [ ] **Step 2 : Commit**

```bash
git add types/index.ts
git commit -m "feat: ajouter types GmailConnection, EmailSummary, EmailDetail"
```

---

### Task 3 : `lib/gmail.ts` — `getValidAccessToken` + test

**Files:**
- Create: `lib/gmail.ts`
- Create: `tests/unit/gmail.test.ts`

- [ ] **Step 1 : Écrire les tests pour `getValidAccessToken`**

Créer `tests/unit/gmail.test.ts` :

```ts
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
  for (const method of ["select", "update", "eq", "single", "limit", "order"]) {
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
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

```bash
npm run test:run -- tests/unit/gmail.test.ts
```

Résultat attendu : FAIL — `getValidAccessToken` n'existe pas.

- [ ] **Step 3 : Créer `lib/gmail.ts` avec `getValidAccessToken`**

```ts
import { supabaseService } from "@/lib/supabase/service"
import { env } from "@/lib/env"
import type { EmailSummary, EmailDetail } from "@/types"

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

export async function getValidAccessToken(): Promise<string> {
  const { data: conn } = await supabaseService
    .from("gmail_connections")
    .select("*")
    .limit(1)
    .single()

  if (!conn) throw new Error("Aucune connexion Gmail configurée")

  const isExpired = new Date(conn.expires_at) <= new Date()
  if (!isExpired) return conn.access_token

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) throw new Error("Échec du refresh token Gmail")

  const { access_token, expires_in } = (await res.json()) as {
    access_token: string
    expires_in: number
  }

  const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

  await supabaseService
    .from("gmail_connections")
    .update({ access_token, expires_at: newExpiresAt, updated_at: new Date().toISOString() })
    .eq("id", conn.id)

  return access_token
}
```

- [ ] **Step 4 : Relancer les tests**

```bash
npm run test:run -- tests/unit/gmail.test.ts
```

Résultat attendu : les 3 tests `getValidAccessToken` passent.

- [ ] **Step 5 : Commit**

```bash
git add lib/gmail.ts tests/unit/gmail.test.ts
git commit -m "feat: getValidAccessToken avec refresh automatique"
```

---

### Task 4 : `lib/gmail.ts` — `listEmails` + test

**Files:**
- Modify: `lib/gmail.ts`
- Modify: `tests/unit/gmail.test.ts`

- [ ] **Step 1 : Ajouter les tests pour `listEmails`**

Ajouter l'import en haut de `tests/unit/gmail.test.ts` (après les imports existants) et les tests à la fin du fichier :

```ts
import { listEmails } from "@/lib/gmail"

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

describe("listEmails", () => {
  it("retourne une liste d'EmailSummary", async () => {
    mockValidToken()

    // Réponse messages.list
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: "msg-1", threadId: "thread-1" }],
        }),
      })
      // Réponse messages.get pour msg-1
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
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm run test:run -- tests/unit/gmail.test.ts
```

Résultat attendu : FAIL — `listEmails` n'existe pas.

- [ ] **Step 3 : Ajouter `listEmails` dans `lib/gmail.ts`**

Ajouter après `getValidAccessToken` :

```ts
function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""
}

export async function listEmails(
  options: { maxResults?: number; query?: string } = {}
): Promise<EmailSummary[]> {
  const token = await getValidAccessToken()
  const { maxResults = 20, query } = options

  const params = new URLSearchParams({ maxResults: String(maxResults), labelIds: "INBOX" })
  if (query) params.set("q", query)

  const listRes = await fetch(`${GMAIL_API}/messages?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!listRes.ok) throw new Error("Erreur Gmail API (list)")

  const listData = (await listRes.json()) as { messages?: { id: string; threadId: string }[] }
  if (!listData.messages?.length) return []

  const messages = await Promise.all(
    listData.messages.map(async ({ id, threadId }) => {
      const msgRes = await fetch(
        `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!msgRes.ok) throw new Error(`Erreur Gmail API (get ${id})`)

      const msg = (await msgRes.json()) as {
        id: string
        threadId: string
        labelIds: string[]
        snippet: string
        payload: { headers: { name: string; value: string }[] }
      }

      return {
        id: msg.id,
        threadId: msg.threadId,
        subject: getHeader(msg.payload.headers, "Subject"),
        from: getHeader(msg.payload.headers, "From"),
        date: getHeader(msg.payload.headers, "Date"),
        snippet: msg.snippet,
        isRead: !msg.labelIds.includes("UNREAD"),
      }
    })
  )

  return messages
}
```

- [ ] **Step 4 : Relancer les tests**

```bash
npm run test:run -- tests/unit/gmail.test.ts
```

Résultat attendu : tous les tests passent.

- [ ] **Step 5 : Commit**

```bash
git add lib/gmail.ts tests/unit/gmail.test.ts
git commit -m "feat: listEmails avec mapping EmailSummary"
```

---

### Task 5 : `lib/gmail.ts` — `getEmail` + test

**Files:**
- Modify: `lib/gmail.ts`
- Modify: `tests/unit/gmail.test.ts`

- [ ] **Step 1 : Ajouter les tests pour `getEmail`**

Ajouter l'import en haut du fichier et les tests à la fin de `tests/unit/gmail.test.ts` :

```ts
import { getEmail } from "@/lib/gmail"

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
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm run test:run -- tests/unit/gmail.test.ts
```

Résultat attendu : FAIL — `getEmail` n'existe pas.

- [ ] **Step 3 : Ajouter `getEmail` dans `lib/gmail.ts`**

```ts
type GmailPart = {
  mimeType: string
  body?: { data?: string }
  parts?: GmailPart[]
}

function extractBody(part: GmailPart): string {
  if (part.mimeType === "text/html" && part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf-8")
  }
  if (part.parts) {
    const html = part.parts.find((p) => p.mimeType === "text/html")
    if (html?.body?.data) return Buffer.from(html.body.data, "base64url").toString("utf-8")
    const plain = part.parts.find((p) => p.mimeType === "text/plain")
    if (plain?.body?.data) return Buffer.from(plain.body.data, "base64url").toString("utf-8")
  }
  if (part.mimeType === "text/plain" && part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf-8")
  }
  return ""
}

export async function getEmail(id: string): Promise<EmailDetail> {
  const token = await getValidAccessToken()

  const res = await fetch(`${GMAIL_API}/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Erreur Gmail API (getEmail ${id})`)

  const msg = (await res.json()) as {
    id: string
    threadId: string
    labelIds: string[]
    snippet: string
    payload: GmailPart & { headers: { name: string; value: string }[] }
  }

  return {
    id: msg.id,
    threadId: msg.threadId,
    subject: getHeader(msg.payload.headers, "Subject"),
    from: getHeader(msg.payload.headers, "From"),
    date: getHeader(msg.payload.headers, "Date"),
    snippet: msg.snippet,
    isRead: !msg.labelIds.includes("UNREAD"),
    body: extractBody(msg.payload),
  }
}
```

- [ ] **Step 4 : Relancer les tests**

```bash
npm run test:run -- tests/unit/gmail.test.ts
```

Résultat attendu : tous les tests passent.

- [ ] **Step 5 : Commit**

```bash
git add lib/gmail.ts tests/unit/gmail.test.ts
git commit -m "feat: getEmail avec extraction body HTML/texte"
```

---

### Task 6 : `lib/gmail.ts` — `sendEmail` + test

**Files:**
- Modify: `lib/gmail.ts`
- Modify: `tests/unit/gmail.test.ts`

- [ ] **Step 1 : Ajouter les tests pour `sendEmail`**

Ajouter l'import en haut du fichier et les tests à la fin de `tests/unit/gmail.test.ts` :

```ts
import { sendEmail } from "@/lib/gmail"

describe("sendEmail", () => {
  it("envoie un email via Gmail API avec encodage base64url", async () => {
    mockValidToken()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "sent-1" }) })

    await sendEmail("client@example.com", "Votre devis", "Bonjour,\n\nVeuillez trouver...")

    expect(mockFetch).toHaveBeenCalledWith(
      `${GMAIL_API}/messages/send`,
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
```

Note : `GMAIL_API` doit être exporté depuis `lib/gmail.ts` pour les tests, ou on peut utiliser l'URL complète dans le test. Utilisez l'URL complète : `"https://gmail.googleapis.com/gmail/v1/users/me/messages/send"`.

Corriger le test précédent pour utiliser l'URL complète :
```ts
expect(mockFetch).toHaveBeenCalledWith(
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
  expect.objectContaining({ method: "POST" })
)
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm run test:run -- tests/unit/gmail.test.ts
```

Résultat attendu : FAIL — `sendEmail` n'existe pas.

- [ ] **Step 3 : Ajouter `sendEmail` dans `lib/gmail.ts`**

```ts
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  replyToMessageId?: string
): Promise<void> {
  const token = await getValidAccessToken()

  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
  ]
  if (replyToMessageId) {
    lines.push(`In-Reply-To: ${replyToMessageId}`)
    lines.push(`References: ${replyToMessageId}`)
  }
  lines.push("", body)

  const raw = Buffer.from(lines.join("\r\n")).toString("base64url")

  const res = await fetch(`${GMAIL_API}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  })

  if (!res.ok) throw new Error("Erreur Gmail API (sendEmail)")
}
```

- [ ] **Step 4 : Relancer les tests**

```bash
npm run test:run -- tests/unit/gmail.test.ts
```

Résultat attendu : tous les tests passent.

- [ ] **Step 5 : Commit**

```bash
git add lib/gmail.ts tests/unit/gmail.test.ts
git commit -m "feat: sendEmail avec encodage RFC 2822 base64url"
```

---

### Task 7 : `lib/gmail.ts` — `markAsRead` + test

**Files:**
- Modify: `lib/gmail.ts`
- Modify: `tests/unit/gmail.test.ts`

- [ ] **Step 1 : Ajouter le test pour `markAsRead`**

Ajouter l'import en haut du fichier et le test à la fin de `tests/unit/gmail.test.ts` :

```ts
import { markAsRead } from "@/lib/gmail"

describe("markAsRead", () => {
  it("appelle Gmail API PATCH avec removeLabelIds UNREAD", async () => {
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
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

```bash
npm run test:run -- tests/unit/gmail.test.ts
```

Résultat attendu : FAIL — `markAsRead` n'existe pas.

- [ ] **Step 3 : Ajouter `markAsRead` dans `lib/gmail.ts`**

```ts
export async function markAsRead(id: string): Promise<void> {
  const token = await getValidAccessToken()

  const res = await fetch(`${GMAIL_API}/messages/${id}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
  })

  if (!res.ok) throw new Error(`Erreur Gmail API (markAsRead ${id})`)
}
```

- [ ] **Step 4 : Lancer tous les tests Gmail**

```bash
npm run test:run -- tests/unit/gmail.test.ts
```

Résultat attendu : tous les tests passent.

- [ ] **Step 5 : Lancer tous les tests du projet**

```bash
npm run test:run
```

Résultat attendu : tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
git add lib/gmail.ts tests/unit/gmail.test.ts
git commit -m "feat: markAsRead — supprime label UNREAD via Gmail API"
```

---

### Task 8 : Routes API OAuth2 (`/api/gmail/auth` et `/api/gmail/callback`)

**Files:**
- Create: `app/api/gmail/auth/route.ts`
- Create: `app/api/gmail/callback/route.ts`

- [ ] **Step 1 : Créer `app/api/gmail/auth/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { supabaseService } from "@/lib/supabase/service"
import { env } from "@/lib/env"

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ")

function requireBureauOrAdmin(role?: string) {
  return role === "admin" || role === "bureau"
}

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (!requireBureauOrAdmin(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}

export async function DELETE(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (!requireBureauOrAdmin(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { data: conn } = await supabaseService
    .from("gmail_connections")
    .select("access_token")
    .limit(1)
    .single()

  if (conn?.access_token) {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${conn.access_token}`,
      { method: "POST" }
    ).catch(() => null)
  }

  await supabaseService.from("gmail_connections").delete().neq("id", "")

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2 : Créer `app/api/gmail/callback/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { supabaseService } from "@/lib/supabase/service"
import { env } from "@/lib/env"

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/login`)
  }

  const code = req.nextUrl.searchParams.get("code")
  const error = req.nextUrl.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error`
    )
  }

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=error`
    )
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const userInfo = (await userInfoRes.json()) as { email: string }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const now = new Date().toISOString()

  await supabaseService.from("gmail_connections").delete().neq("id", "")

  await supabaseService.from("gmail_connections").insert({
    email: userInfo.email,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    created_at: now,
    updated_at: now,
  })

  return NextResponse.redirect(
    `${env.NEXT_PUBLIC_APP_URL}/parametres?gmail=connected`
  )
}
```

- [ ] **Step 3 : Commit**

```bash
git add app/api/gmail/auth/route.ts app/api/gmail/callback/route.ts
git commit -m "feat: routes OAuth2 Gmail (auth, callback, disconnect)"
```

---

### Task 9 : Page Paramètres avec section Gmail

**Files:**
- Create: `app/(bureau)/parametres/page.tsx`
- Create: `components/parametres/gmail-connection-section.tsx`

- [ ] **Step 1 : Créer `components/parametres/gmail-connection-section.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  connection: { email: string; created_at: string } | null
  gmailParam?: string
}

export function GmailConnectionSection({ connection, gmailParam }: Props) {
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  async function handleDisconnect() {
    setIsDisconnecting(true)
    try {
      await fetch("/api/gmail/auth", { method: "DELETE" })
      window.location.reload()
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Mail className="size-5 text-muted-foreground" />
        <div>
          <h3 className="font-medium text-foreground">Boîte mail</h3>
          <p className="text-sm text-muted-foreground">
            Connectez la boîte Gmail de l'entreprise pour gérer les emails depuis l'application.
          </p>
        </div>
      </div>

      {gmailParam === "connected" && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-md px-3 py-2">
          <CheckCircle className="size-4" />
          Boîte mail connectée avec succès.
        </div>
      )}

      {gmailParam === "error" && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          <XCircle className="size-4" />
          Erreur lors de la connexion. Veuillez réessayer.
        </div>
      )}

      {connection ? (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Connecté en tant que </span>
            <span className="font-medium text-foreground">{connection.email}</span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting && <Loader2 className="size-4 animate-spin" />}
            Déconnecter
          </Button>
        </div>
      ) : (
        <a href="/api/gmail/auth">
          <Button size="sm">
            <Mail className="size-4" />
            Connecter Gmail
          </Button>
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Créer `app/(bureau)/parametres/page.tsx`**

```tsx
import type { Metadata } from "next"
import { Settings } from "lucide-react"
import { supabaseService } from "@/lib/supabase/service"
import { GmailConnectionSection } from "@/components/parametres/gmail-connection-section"

export const metadata: Metadata = {
  title: "Paramètres — BTP×AI",
}

type SearchParams = Promise<{ gmail?: string }>

export default async function ParametresPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { gmail } = await searchParams

  const { data: connection } = await supabaseService
    .from("gmail_connections")
    .select("email, created_at")
    .limit(1)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-wider uppercase">
            Configuration
          </span>
        </div>
        <h1 className="font-heading text-3xl font-700 tracking-wide uppercase text-foreground">
          Paramètres
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez les intégrations et la configuration de l'application.
        </p>
      </div>

      <div className="max-w-2xl space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground tracking-wider uppercase">
          Intégrations
        </h2>
        <GmailConnectionSection connection={connection} gmailParam={gmail} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3 : Commit**

```bash
git add app/(bureau)/parametres/page.tsx components/parametres/gmail-connection-section.tsx
git commit -m "feat: page paramètres avec section connexion Gmail"
```

---

### Task 10 : Page Inbox + `GmailConnectionBanner`

**Files:**
- Create: `app/(bureau)/inbox/page.tsx`
- Create: `components/inbox/gmail-connection-banner.tsx`

- [ ] **Step 1 : Créer `components/inbox/gmail-connection-banner.tsx`**

```tsx
import Link from "next/link"
import { Mail } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export function GmailConnectionBanner() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center space-y-4">
      <div className="flex justify-center">
        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="size-6 text-primary" />
        </div>
      </div>
      <div>
        <h3 className="font-medium text-foreground">Aucune boîte mail connectée</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Connectez la boîte Gmail de l'entreprise pour accéder à vos emails.
        </p>
      </div>
      <Link href="/parametres" className={buttonVariants({ variant: "default" })}>
        Configurer dans les paramètres
      </Link>
    </div>
  )
}
```

- [ ] **Step 2 : Créer `app/(bureau)/inbox/page.tsx`**

```tsx
import type { Metadata } from "next"
import { Mail } from "lucide-react"
import { supabaseService } from "@/lib/supabase/service"
import { listEmails } from "@/lib/gmail"
import { GmailConnectionBanner } from "@/components/inbox/gmail-connection-banner"
import { EmailList } from "@/components/inbox/email-list"

export const metadata: Metadata = {
  title: "Messagerie — BTP×AI",
}

export default async function InboxPage() {
  const { data: connection } = await supabaseService
    .from("gmail_connections")
    .select("email")
    .limit(1)
    .single()

  const emails = connection
    ? await listEmails({ maxResults: 50 }).catch(() => [])
    : []

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mail className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-wider uppercase">
            Communication
          </span>
        </div>
        <h1 className="font-heading text-3xl font-700 tracking-wide uppercase text-foreground">
          Messagerie
        </h1>
        {connection && (
          <p className="mt-1 text-sm text-muted-foreground">
            {connection.email} · {emails.length} email{emails.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {!connection ? (
        <GmailConnectionBanner />
      ) : (
        <EmailList emails={emails} />
      )}
    </div>
  )
}
```

- [ ] **Step 3 : Commit**

```bash
git add app/(bureau)/inbox/page.tsx components/inbox/gmail-connection-banner.tsx
git commit -m "feat: page inbox avec GmailConnectionBanner et chargement RSC"
```

---

### Task 11 : Composant `EmailList`

**Files:**
- Create: `components/inbox/email-list.tsx`

- [ ] **Step 1 : Créer `components/inbox/email-list.tsx`**

```tsx
"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { EmailSummary, EmailDetail } from "@/types"
import { EmailDetail as EmailDetailComponent } from "./email-detail"

type Props = {
  emails: EmailSummary[]
}

function formatEmailDate(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: fr })
  } catch {
    return dateStr
  }
}

export function EmailList({ emails }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    emails[0]?.id ?? null
  )
  const [readIds, setReadIds] = useState<Set<string>>(
    new Set(emails.filter((e) => e.isRead).map((e) => e.id))
  )

  function handleSelect(id: string) {
    setSelectedId(id)
    setReadIds((prev) => new Set([...prev, id]))
  }

  if (emails.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Aucun email dans la boîte de réception.
      </p>
    )
  }

  return (
    <div className="flex gap-0 border border-border rounded-lg overflow-hidden min-h-[600px]">
      {/* Liste */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0 border-r border-border overflow-y-auto">
        {emails.map((email) => {
          const isRead = readIds.has(email.id)
          const isSelected = selectedId === email.id
          return (
            <button
              key={email.id}
              onClick={() => handleSelect(email.id)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border transition-colors",
                isSelected
                  ? "bg-primary/10"
                  : "hover:bg-muted/50",
                !isRead && "bg-blue-50/50"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className={cn("text-sm truncate", !isRead && "font-semibold text-foreground")}>
                  {email.from.replace(/<.*>/, "").trim() || email.from}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatEmailDate(email.date)}
                </span>
              </div>
              <p className={cn("text-sm truncate", isRead ? "text-muted-foreground" : "text-foreground font-medium")}>
                {email.subject || "(Sans objet)"}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {email.snippet}
              </p>
            </button>
          )
        })}
      </div>

      {/* Détail */}
      <div className="flex-1 hidden lg:block">
        {selectedId ? (
          <EmailDetailComponent messageId={selectedId} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Sélectionnez un email
          </div>
        )}
      </div>
    </div>
  )
}
```

Note : ce composant requiert `date-fns`. Installer avec :
```bash
npm install date-fns
```

- [ ] **Step 2 : Installer `date-fns`**

```bash
npm install date-fns
```

- [ ] **Step 3 : Commit**

```bash
git add components/inbox/email-list.tsx package.json package-lock.json
git commit -m "feat: composant EmailList avec sélection et badge non-lu"
```

---

### Task 12 : Composant `EmailDetail`

**Files:**
- Create: `components/inbox/email-detail.tsx`

- [ ] **Step 1 : Créer `components/inbox/email-detail.tsx`**

```tsx
"use client"

import { useEffect, useState, useTransition } from "react"
import { Reply, Loader2, Send, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { EmailDetail } from "@/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const replySchema = z.object({
  body: z.string().min(1, "Le message ne peut pas être vide"),
})
type ReplyForm = z.infer<typeof replySchema>

type Props = {
  messageId: string
}

export function EmailDetail({ messageId }: Props) {
  const [email, setEmail] = useState<EmailDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [isSending, startSending] = useTransition()

  const form = useForm<ReplyForm>({
    resolver: zodResolver(replySchema),
    defaultValues: { body: "" },
  })

  useEffect(() => {
    setEmail(null)
    setShowReply(false)
    form.reset()

    setIsLoading(true)
    fetch(`/api/gmail/messages/${messageId}`)
      .then((r) => r.json())
      .then((data: { email: EmailDetail }) => setEmail(data.email))
      .catch(() => toast.error("Impossible de charger l'email"))
      .finally(() => setIsLoading(false))
  }, [messageId, form])

  function onSubmit(values: ReplyForm) {
    if (!email) return
    startSending(async () => {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email.from,
          subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
          body: values.body,
          replyToMessageId: email.id,
        }),
      })
      if (!res.ok) {
        toast.error("Erreur lors de l'envoi")
        return
      }
      toast.success("Réponse envoyée")
      setShowReply(false)
      form.reset()
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!email) return null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border space-y-1">
        <h2 className="font-semibold text-foreground text-lg">
          {email.subject || "(Sans objet)"}
        </h2>
        <p className="text-sm text-muted-foreground">
          De : <span className="text-foreground">{email.from}</span>
        </p>
        <p className="text-xs text-muted-foreground">{email.date}</p>
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {email.body.startsWith("<") ? (
          <iframe
            srcDoc={email.body}
            sandbox="allow-same-origin"
            className="w-full min-h-[400px] border-0"
            title="Contenu de l'email"
          />
        ) : (
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
            {email.body}
          </pre>
        )}
      </div>

      {/* Réponse */}
      <div className="px-6 py-4 border-t border-border">
        {!showReply ? (
          <Button variant="outline" size="sm" onClick={() => setShowReply(true)}>
            <Reply className="size-4" />
            Répondre
          </Button>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <Textarea
              placeholder="Votre réponse..."
              rows={5}
              {...form.register("body")}
            />
            {form.formState.errors.body && (
              <p className="text-xs text-destructive">
                {form.formState.errors.body.message}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSending}>
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Envoyer
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowReply(false); form.reset() }}
              >
                <X className="size-4" />
                Annuler
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Créer la route API `/api/gmail/messages/[id]/route.ts`**

Ce composant appelle `/api/gmail/messages/[id]` et `/api/gmail/send` — il faut créer ces routes.

Créer `app/api/gmail/messages/[id]/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getEmail, markAsRead } from "@/lib/gmail"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  try {
    const email = await getEmail(id)
    await markAsRead(id).catch(() => null)
    return NextResponse.json({ email })
  } catch (err) {
    console.error("Erreur getEmail:", err)
    return NextResponse.json({ error: "Impossible de charger l'email" }, { status: 500 })
  }
}
```

Créer `app/api/gmail/send/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/gmail"

const sendSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  replyToMessageId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
  }

  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 422 })
  }

  try {
    await sendEmail(parsed.data.to, parsed.data.subject, parsed.data.body, parsed.data.replyToMessageId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Erreur sendEmail:", err)
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 })
  }
}
```

- [ ] **Step 3 : Lancer tous les tests**

```bash
npm run test:run
```

Résultat attendu : tous les tests passent.

- [ ] **Step 4 : Commit final**

```bash
git add components/inbox/email-detail.tsx app/api/gmail/messages/[id]/route.ts app/api/gmail/send/route.ts
git commit -m "feat: EmailDetail avec formulaire réponse inline et routes API"
```

---

## Récapitulatif des fichiers créés/modifiés

| Fichier | Action |
|---------|--------|
| `supabase/migrations/20260429000007_gmail_connections.sql` | Créé |
| `vitest.config.ts` | Modifié |
| `types/index.ts` | Modifié |
| `lib/gmail.ts` | Créé |
| `tests/unit/gmail.test.ts` | Créé |
| `app/api/gmail/auth/route.ts` | Créé |
| `app/api/gmail/callback/route.ts` | Créé |
| `app/api/gmail/messages/[id]/route.ts` | Créé |
| `app/api/gmail/send/route.ts` | Créé |
| `app/(bureau)/inbox/page.tsx` | Créé |
| `app/(bureau)/parametres/page.tsx` | Créé |
| `components/inbox/gmail-connection-banner.tsx` | Créé |
| `components/inbox/email-list.tsx` | Créé |
| `components/inbox/email-detail.tsx` | Créé |
| `components/parametres/gmail-connection-section.tsx` | Créé |
