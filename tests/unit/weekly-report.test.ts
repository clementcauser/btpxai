import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { WeeklyReportData } from "@/lib/weekly-report"
import { weeklyReportNarrativeSchema } from "@/lib/agents/weekly-report"
import { buildWeeklyReportSubject, buildWeeklyReportHtml } from "@/lib/email/weekly-report"

// ─── supabaseService mock ─────────────────────────────────────────────────────

const mockFrom = vi.hoisted(() => vi.fn())
vi.mock("@/lib/supabase/service", () => ({
  supabaseService: { from: mockFrom },
}))

import {
  getLastWeekRange,
  getWeeklyQuoteStats,
  getWeeklyProjectStats,
  getWeeklyAttentionPoints,
  getWeeklyReportRecipients,
} from "@/lib/weekly-report"

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeBuilder(result: { data: unknown; error: null | object; count?: number | null }) {
  const builder: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  }
  for (const m of ["select", "eq", "gte", "lt", "lte", "in", "not", "limit", "single", "head"]) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  return builder
}

function makeCountBuilder(count: number) {
  return makeBuilder({ data: null, error: null, count })
}

// ─── getLastWeekRange ─────────────────────────────────────────────────────────

describe("getLastWeekRange", () => {
  const monday = new Date("2026-05-04T08:00:00Z") // a Monday

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(monday)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns end as start of today (midnight UTC)", () => {
    const { end } = getLastWeekRange()
    expect(end).toBe("2026-05-04T00:00:00.000Z")
  })

  it("returns start exactly 7 days before end", () => {
    const { start, end } = getLastWeekRange()
    const diff = new Date(end).getTime() - new Date(start).getTime()
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it("start is the previous Monday (2026-04-27)", () => {
    const { start } = getLastWeekRange()
    expect(start).toBe("2026-04-27T00:00:00.000Z")
  })
})

// ─── getWeeklyQuoteStats ──────────────────────────────────────────────────────

describe("getWeeklyQuoteStats", () => {
  beforeEach(() => vi.clearAllMocks())

  const range = {
    start: "2026-04-27T00:00:00.000Z",
    end: "2026-05-04T00:00:00.000Z",
  }

  it("counts sent, accepted, rejected and sums CA", async () => {
    const rows = [
      { status: "sent", total_ht: 1200 },
      { status: "accepted", total_ht: 3000 },
      { status: "accepted", total_ht: 1500 },
      { status: "rejected", total_ht: 800 },
    ]
    const builder = makeBuilder({ data: rows, error: null })
    mockFrom.mockReturnValueOnce(builder)

    const stats = await getWeeklyQuoteStats({ from: mockFrom } as never, range)

    expect(stats.sent).toBe(4)
    expect(stats.accepted).toBe(2)
    expect(stats.rejected).toBe(1)
    expect(stats.caRealiseHT).toBe(4500)
  })

  it("returns zeros when no quotes exist", async () => {
    const builder = makeBuilder({ data: [], error: null })
    mockFrom.mockReturnValueOnce(builder)

    const stats = await getWeeklyQuoteStats({ from: mockFrom } as never, range)

    expect(stats.sent).toBe(0)
    expect(stats.accepted).toBe(0)
    expect(stats.rejected).toBe(0)
    expect(stats.caRealiseHT).toBe(0)
  })

  it("throws on database error", async () => {
    const dbError = { message: "DB error", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    mockFrom.mockReturnValueOnce(builder)

    await expect(getWeeklyQuoteStats({ from: mockFrom } as never, range)).rejects.toEqual(dbError)
  })

  it("filters by sent_at range (gte start, lt end)", async () => {
    const builder = makeBuilder({ data: [], error: null })
    mockFrom.mockReturnValueOnce(builder)

    await getWeeklyQuoteStats({ from: mockFrom } as never, range)

    expect(builder.gte).toHaveBeenCalledWith("sent_at", range.start)
    expect(builder.lt).toHaveBeenCalledWith("sent_at", range.end)
  })
})

// ─── getWeeklyProjectStats ────────────────────────────────────────────────────

describe("getWeeklyProjectStats", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns completed and in_progress counts", async () => {
    const completedBuilder = makeCountBuilder(5)
    const inProgressBuilder = makeCountBuilder(3)
    mockFrom.mockReturnValueOnce(completedBuilder).mockReturnValueOnce(inProgressBuilder)

    const stats = await getWeeklyProjectStats({ from: mockFrom } as never)

    expect(stats.completedTotal).toBe(5)
    expect(stats.inProgressTotal).toBe(3)
  })

  it("defaults to 0 when count is null", async () => {
    const completedBuilder = makeCountBuilder(0)
    const inProgressBuilder = makeCountBuilder(0)
    mockFrom.mockReturnValueOnce(completedBuilder).mockReturnValueOnce(inProgressBuilder)

    const stats = await getWeeklyProjectStats({ from: mockFrom } as never)

    expect(stats.completedTotal).toBe(0)
    expect(stats.inProgressTotal).toBe(0)
  })
})

// ─── getWeeklyAttentionPoints ─────────────────────────────────────────────────

describe("getWeeklyAttentionPoints", () => {
  beforeEach(() => vi.clearAllMocks())

  const weekStart = "2026-04-27T00:00:00.000Z"

  it("returns all four attention point counts", async () => {
    mockFrom
      .mockReturnValueOnce(makeCountBuilder(2))  // pendingQuotes
      .mockReturnValueOnce(makeCountBuilder(1))  // openAlerts
      .mockReturnValueOnce(makeCountBuilder(4))  // pendingMaterials
      .mockReturnValueOnce(makeCountBuilder(7))  // unprocessedEmails

    const points = await getWeeklyAttentionPoints({ from: mockFrom } as never, weekStart)

    expect(points.pendingQuotes).toBe(2)
    expect(points.openAlerts).toBe(1)
    expect(points.pendingMaterials).toBe(4)
    expect(points.unprocessedEmails).toBe(7)
  })

  it("filters pending quotes by sent_at < weekStart", async () => {
    const pendingBuilder = makeCountBuilder(0)
    mockFrom
      .mockReturnValueOnce(pendingBuilder)
      .mockReturnValueOnce(makeCountBuilder(0))
      .mockReturnValueOnce(makeCountBuilder(0))
      .mockReturnValueOnce(makeCountBuilder(0))

    await getWeeklyAttentionPoints({ from: mockFrom } as never, weekStart)

    expect(pendingBuilder.eq).toHaveBeenCalledWith("status", "sent")
    expect(pendingBuilder.lt).toHaveBeenCalledWith("sent_at", weekStart)
  })
})

// ─── getWeeklyReportRecipients ────────────────────────────────────────────────

describe("getWeeklyReportRecipients", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns parsed email list from app_settings", async () => {
    const builder = makeBuilder({
      data: { value: '["gerant@btpxai.fr","bureau@btpxai.fr"]' },
      error: null,
    })
    mockFrom.mockReturnValueOnce(builder)

    const result = await getWeeklyReportRecipients()

    expect(result).toEqual(["gerant@btpxai.fr", "bureau@btpxai.fr"])
  })

  it("returns empty array when setting is absent", async () => {
    const builder = makeBuilder({ data: null, error: null })
    mockFrom.mockReturnValueOnce(builder)

    const result = await getWeeklyReportRecipients()

    expect(result).toEqual([])
  })

  it("returns empty array when value is invalid JSON", async () => {
    const builder = makeBuilder({ data: { value: "not-json" }, error: null })
    mockFrom.mockReturnValueOnce(builder)

    const result = await getWeeklyReportRecipients()

    expect(result).toEqual([])
  })

  it("filters out non-string entries from the array", async () => {
    const builder = makeBuilder({
      data: { value: '["valid@example.com", 42, null, "another@example.com"]' },
      error: null,
    })
    mockFrom.mockReturnValueOnce(builder)

    const result = await getWeeklyReportRecipients()

    expect(result).toEqual(["valid@example.com", "another@example.com"])
  })

  it("returns empty array when value is a non-array JSON", async () => {
    const builder = makeBuilder({
      data: { value: '"single-email@example.com"' },
      error: null,
    })
    mockFrom.mockReturnValueOnce(builder)

    const result = await getWeeklyReportRecipients()

    expect(result).toEqual([])
  })
})

// ─── weeklyReportNarrativeSchema ──────────────────────────────────────────────

describe("weeklyReportNarrativeSchema (agent output validation)", () => {
  const valid = {
    summary: "Bonne semaine avec 3 devis envoyés.",
    highlights: ["CA de 4 500 € réalisé", "2 devis acceptés"],
    attentionItems: ["1 devis ancien en attente de réponse"],
  }

  it("accepts a valid narrative", () => {
    expect(weeklyReportNarrativeSchema.safeParse(valid).success).toBe(true)
  })

  it("accepts empty attentionItems", () => {
    expect(
      weeklyReportNarrativeSchema.safeParse({ ...valid, attentionItems: [] }).success
    ).toBe(true)
  })

  it("rejects empty summary", () => {
    expect(
      weeklyReportNarrativeSchema.safeParse({ ...valid, summary: "" }).success
    ).toBe(false)
  })

  it("rejects missing highlights field", () => {
    const { highlights: _h, ...rest } = valid
    expect(weeklyReportNarrativeSchema.safeParse(rest).success).toBe(false)
  })
})

// ─── buildWeeklyReportSubject ─────────────────────────────────────────────────

describe("buildWeeklyReportSubject", () => {
  it("includes the week start date in the subject", () => {
    const subject = buildWeeklyReportSubject("2026-04-27T00:00:00.000Z")
    expect(subject).toContain("27 avril")
    expect(subject).toMatch(/rapport hebdomadaire/i)
  })
})

// ─── buildWeeklyReportHtml ────────────────────────────────────────────────────

describe("buildWeeklyReportHtml", () => {
  const data: WeeklyReportData = {
    weekRange: {
      start: "2026-04-27T00:00:00.000Z",
      end: "2026-05-04T00:00:00.000Z",
    },
    quotes: { sent: 5, accepted: 3, rejected: 1, caRealiseHT: 7500 },
    projects: { completedTotal: 10, inProgressTotal: 4 },
    attentionPoints: {
      pendingQuotes: 2,
      openAlerts: 1,
      pendingMaterials: 0,
      unprocessedEmails: 3,
    },
  }

  const narrative = {
    summary: "Bonne semaine avec 5 devis envoyés et 3 acceptés.",
    highlights: ["CA de 7 500 € réalisé", "3 devis acceptés cette semaine"],
    attentionItems: ["2 anciens devis en attente", "1 alerte terrain ouverte"],
  }

  it("renders quote counts in the HTML", () => {
    const html = buildWeeklyReportHtml(data, narrative)
    expect(html).toContain(">5<")   // sent
    expect(html).toContain(">3<")   // accepted
    expect(html).toContain(">1<")   // rejected
    expect(html).toContain(">4<")   // in_progress
  })

  it("renders the summary text", () => {
    const html = buildWeeklyReportHtml(data, narrative)
    expect(html).toContain(narrative.summary)
  })

  it("renders highlights", () => {
    const html = buildWeeklyReportHtml(data, narrative)
    expect(html).toContain(narrative.highlights[0])
    expect(html).toContain(narrative.highlights[1])
  })

  it("renders attention items when present", () => {
    const html = buildWeeklyReportHtml(data, narrative)
    expect(html).toContain(narrative.attentionItems[0])
  })

  it("omits attention section when attentionItems is empty", () => {
    const html = buildWeeklyReportHtml(data, {
      ...narrative,
      attentionItems: [],
    })
    expect(html).not.toContain("Points d'attention")
  })

  it("includes BTP branding", () => {
    const html = buildWeeklyReportHtml(data, narrative)
    expect(html).toContain("BTP × AI Métallerie")
  })
})
