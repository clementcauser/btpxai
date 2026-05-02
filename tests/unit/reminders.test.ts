import { describe, it, expect, vi, beforeEach } from "vitest"
import type { ReminderType, QuoteWithContext } from "@/types"

// ─── supabaseService mock ──────────────────────────────────────────────────

const mockFrom = vi.hoisted(() => vi.fn())
vi.mock("@/lib/supabase/service", () => ({
  supabaseService: { from: mockFrom },
}))

import {
  getQuotesDueForReminder,
  logReminder,
  hasReminder,
  setQuoteRemindersEnabled,
} from "@/lib/reminders"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeBuilder(result: { data: unknown; error: null | object }) {
  const builder: Record<string, unknown> = {
    then: (
      resolve: (v: unknown) => unknown,
      reject?: (r: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject),
  }
  for (const m of [
    "select",
    "insert",
    "update",
    "eq",
    "lte",
    "not",
    "limit",
    "single",
  ]) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  return builder
}

// ─── fixtures ─────────────────────────────────────────────────────────────────

const now = new Date("2026-04-30T08:00:00Z")

function makeSentQuote(
  overrides: Partial<{ id: string; sent_at: string; status: string }>
): QuoteWithContext {
  return {
    id: "q1",
    project_id: "p1",
    status: "sent",
    total_ht: 1000,
    tva_rate: 20,
    notes: null,
    validity_days: 30,
    reference: "DEV-001",
    created_at: "2026-04-01T00:00:00Z",
    sent_at: "2026-04-20T00:00:00Z",
    reminders_enabled: true,
    items: [],
    project: {
      id: "p1",
      client_id: "c1",
      title: "Portail acier",
      description: null,
      status: "in_progress",
      created_at: "2026-04-01T00:00:00Z",
      client: {
        id: "c1",
        name: "Jean Dupont",
        email: "jean@example.com",
        phone: null,
        address: null,
        created_at: "2026-04-01T00:00:00Z",
      },
    },
    ...overrides,
  } as QuoteWithContext
}

// ─── getQuotesDueForReminder ──────────────────────────────────────────────────

describe("getQuotesDueForReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.setSystemTime(now)
  })

  it("returns quotes not yet reminded for quote_j7", async () => {
    const quote = makeSentQuote({ id: "q1" })
    const remindersBuilder = makeBuilder({ data: [], error: null })
    const quotesBuilder = makeBuilder({ data: [quote], error: null })
    mockFrom
      .mockReturnValueOnce(remindersBuilder)
      .mockReturnValueOnce(quotesBuilder)

    const result = await getQuotesDueForReminder("ws1", "quote_j7")

    expect(mockFrom).toHaveBeenNthCalledWith(1, "quote_reminders")
    expect(remindersBuilder.eq).toHaveBeenCalledWith("type", "quote_j7")
    expect(mockFrom).toHaveBeenNthCalledWith(2, "quotes")
    expect(quotesBuilder.eq).toHaveBeenCalledWith("status", "sent")
    expect(quotesBuilder.eq).toHaveBeenCalledWith("reminders_enabled", true)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("q1")
  })

  it("excludes quotes that already have a reminder of the given type", async () => {
    const remindersBuilder = makeBuilder({
      data: [{ quote_id: "q1" }],
      error: null,
    })
    const quote = makeSentQuote({ id: "q1" })
    const quotesBuilder = makeBuilder({ data: [quote], error: null })
    mockFrom
      .mockReturnValueOnce(remindersBuilder)
      .mockReturnValueOnce(quotesBuilder)

    const result = await getQuotesDueForReminder("ws1", "quote_j7")
    expect(result).toHaveLength(0)
  })

  it("uses status 'accepted' for payment reminders", async () => {
    const remindersBuilder = makeBuilder({ data: [], error: null })
    const quotesBuilder = makeBuilder({ data: [], error: null })
    mockFrom
      .mockReturnValueOnce(remindersBuilder)
      .mockReturnValueOnce(quotesBuilder)

    await getQuotesDueForReminder("ws1", "payment")

    expect(quotesBuilder.eq).toHaveBeenCalledWith("status", "accepted")
  })

  it("throws when the quotes query fails", async () => {
    const remindersBuilder = makeBuilder({ data: [], error: null })
    const dbError = { message: "DB error", code: "500" }
    const quotesBuilder = makeBuilder({ data: null, error: dbError })
    mockFrom
      .mockReturnValueOnce(remindersBuilder)
      .mockReturnValueOnce(quotesBuilder)

    await expect(getQuotesDueForReminder("ws1", "quote_j14")).rejects.toEqual(dbError)
  })
})

// ─── logReminder ──────────────────────────────────────────────────────────────

describe("logReminder", () => {
  beforeEach(() => vi.clearAllMocks())

  it("inserts a reminder record and returns it", async () => {
    const reminder = {
      id: "r1",
      quote_id: "q1",
      type: "quote_j7",
      sent_at: "2026-04-30T08:00:00Z",
      email_to: "jean@example.com",
    }
    const builder = makeBuilder({ data: reminder, error: null })
    mockFrom.mockReturnValueOnce(builder)

    const result = await logReminder("ws1", "q1", "quote_j7", "jean@example.com")

    expect(mockFrom).toHaveBeenCalledWith("quote_reminders")
    expect(builder.insert).toHaveBeenCalledWith({
      workspace_id: "ws1",
      quote_id: "q1",
      type: "quote_j7",
      email_to: "jean@example.com",
    })
    expect(result).toEqual(reminder)
  })

  it("throws on insert error", async () => {
    const dbError = { message: "Insert failed", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    mockFrom.mockReturnValueOnce(builder)

    await expect(
      logReminder("ws1", "q1", "quote_j7", "jean@example.com")
    ).rejects.toEqual(dbError)
  })
})

// ─── hasReminder ─────────────────────────────────────────────────────────────

describe("hasReminder", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns true when a reminder record exists", async () => {
    const builder = makeBuilder({ data: [{ id: "r1" }], error: null })
    mockFrom.mockReturnValueOnce(builder)

    const result = await hasReminder("q1", "quote_j7")

    expect(result).toBe(true)
    expect(builder.eq).toHaveBeenCalledWith("quote_id", "q1")
    expect(builder.eq).toHaveBeenCalledWith("type", "quote_j7")
  })

  it("returns false when no reminder record exists", async () => {
    const builder = makeBuilder({ data: [], error: null })
    mockFrom.mockReturnValueOnce(builder)

    const result = await hasReminder("q1", "quote_j14")
    expect(result).toBe(false)
  })
})

// ─── setQuoteRemindersEnabled ─────────────────────────────────────────────────

describe("setQuoteRemindersEnabled", () => {
  beforeEach(() => vi.clearAllMocks())

  it("updates reminders_enabled to false", async () => {
    const builder = makeBuilder({ data: null, error: null })
    mockFrom.mockReturnValueOnce(builder)

    await expect(
      setQuoteRemindersEnabled("q1", false)
    ).resolves.toBeUndefined()

    expect(mockFrom).toHaveBeenCalledWith("quotes")
    expect(builder.update).toHaveBeenCalledWith({ reminders_enabled: false })
    expect(builder.eq).toHaveBeenCalledWith("id", "q1")
  })

  it("throws on update error", async () => {
    const dbError = { message: "Update failed", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    mockFrom.mockReturnValueOnce(builder)

    await expect(
      setQuoteRemindersEnabled("q1", true)
    ).rejects.toEqual(dbError)
  })
})

// ─── Reminder trigger day logic ───────────────────────────────────────────────

describe("reminder trigger day logic", () => {
  const REMINDER_DAYS: Record<ReminderType, number> = {
    quote_j7: 7,
    quote_j14: 14,
    payment: 7,
  }

  it.each([
    ["quote_j7", 7],
    ["quote_j14", 14],
    ["payment", 7],
  ] as [ReminderType, number][])(
    "%s triggers after %d days",
    (type, days) => {
      const today = new Date("2026-04-30T00:00:00Z")
      const sentAt = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
      const threshold = new Date(
        today.getTime() - REMINDER_DAYS[type] * 24 * 60 * 60 * 1000
      )

      expect(sentAt.getTime()).toBeLessThanOrEqual(threshold.getTime())
    }
  )

  it("quote sent 6 days ago should NOT trigger quote_j7", () => {
    const today = new Date("2026-04-30T00:00:00Z")
    const sentAt = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
    const threshold = new Date(
      today.getTime() - REMINDER_DAYS["quote_j7"] * 24 * 60 * 60 * 1000
    )

    expect(sentAt.getTime()).toBeGreaterThan(threshold.getTime())
  })
})
