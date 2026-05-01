import { describe, it, expect, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getPendingQuotesCount,
  getActiveProjectsCount,
  getUnprocessedEmailsCount,
  getWeeklyRevenue,
  getPendingMaterialsCount,
  getOpenAlertsCount,
  getDashboardMetrics,
  getWeekStart,
} from "@/lib/dashboard"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>

// Creates a fluent Supabase-like builder that resolves to `result` when awaited.
// Supports: select, eq, in, gte, head (for count queries).
function makeBuilder(result: {
  data?: unknown
  count?: number | null
  error: null | object
}) {
  const builder: Record<string, unknown> = {
    then: (
      resolve: (v: unknown) => unknown,
      reject?: (r: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject),
  }

  for (const method of ["select", "eq", "in", "gte", "head"]) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  return builder
}

function makeSupabase(...builders: ReturnType<typeof makeBuilder>[]) {
  const from = vi.fn()
  builders.forEach((b) => from.mockReturnValueOnce(b))
  return { from } as unknown as AnyClient
}

// ── getWeekStart ──────────────────────────────────────────────────────────────

describe("getWeekStart", () => {
  it("always returns a Monday", () => {
    const result = getWeekStart()
    expect(result.getDay()).toBe(1)
  })

  it("returns midnight (00:00:00.000)", () => {
    const result = getWeekStart()
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it("returns a date in the past or today", () => {
    const result = getWeekStart()
    expect(result.getTime()).toBeLessThanOrEqual(Date.now())
  })
})

// ── getPendingQuotesCount ─────────────────────────────────────────────────────

describe("getPendingQuotesCount", () => {
  it("returns count of sent quotes", async () => {
    const builder = makeBuilder({ count: 7, error: null })
    const supabase = makeSupabase(builder)

    const result = await getPendingQuotesCount(supabase)

    expect(result).toBe(7)
    expect(builder.eq).toHaveBeenCalledWith("status", "sent")
  })

  it("returns 0 when count is null", async () => {
    const builder = makeBuilder({ count: null, error: null })
    const supabase = makeSupabase(builder)

    expect(await getPendingQuotesCount(supabase)).toBe(0)
  })

  it("returns 0 on error", async () => {
    const builder = makeBuilder({ count: null, error: { message: "db error" } })
    const supabase = makeSupabase(builder)

    expect(await getPendingQuotesCount(supabase)).toBe(0)
  })
})

// ── getActiveProjectsCount ────────────────────────────────────────────────────

describe("getActiveProjectsCount", () => {
  it("returns count of in_progress projects", async () => {
    const builder = makeBuilder({ count: 3, error: null })
    const supabase = makeSupabase(builder)

    const result = await getActiveProjectsCount(supabase)

    expect(result).toBe(3)
    expect(builder.eq).toHaveBeenCalledWith("status", "in_progress")
  })

  it("returns 0 when count is null", async () => {
    const builder = makeBuilder({ count: null, error: null })
    const supabase = makeSupabase(builder)

    expect(await getActiveProjectsCount(supabase)).toBe(0)
  })

  it("returns 0 on error", async () => {
    const builder = makeBuilder({ count: null, error: { message: "db error" } })
    const supabase = makeSupabase(builder)

    expect(await getActiveProjectsCount(supabase)).toBe(0)
  })
})

// ── getUnprocessedEmailsCount ─────────────────────────────────────────────────

describe("getUnprocessedEmailsCount", () => {
  it("returns count of a_traiter email statuses", async () => {
    const builder = makeBuilder({ count: 12, error: null })
    const supabase = makeSupabase(builder)

    const result = await getUnprocessedEmailsCount(supabase)

    expect(result).toBe(12)
    expect(builder.eq).toHaveBeenCalledWith("status", "a_traiter")
  })

  it("returns 0 on error", async () => {
    const builder = makeBuilder({ count: null, error: { message: "db error" } })
    const supabase = makeSupabase(builder)

    expect(await getUnprocessedEmailsCount(supabase)).toBe(0)
  })
})

// ── getWeeklyRevenue ──────────────────────────────────────────────────────────

describe("getWeeklyRevenue", () => {
  it("sums total_ht for accepted quotes this week", async () => {
    const builder = makeBuilder({
      data: [{ total_ht: 1200 }, { total_ht: 3450.5 }],
      error: null,
    })
    const supabase = makeSupabase(builder)

    const result = await getWeeklyRevenue(supabase)

    expect(result).toBe(4650.5)
    expect(builder.eq).toHaveBeenCalledWith("status", "accepted")
  })

  it("returns 0 for empty data", async () => {
    const builder = makeBuilder({ data: [], error: null })
    const supabase = makeSupabase(builder)

    expect(await getWeeklyRevenue(supabase)).toBe(0)
  })

  it("returns 0 on error", async () => {
    const builder = makeBuilder({ data: null, error: { message: "db error" } })
    const supabase = makeSupabase(builder)

    expect(await getWeeklyRevenue(supabase)).toBe(0)
  })

  it("rounds result to 2 decimal places", async () => {
    // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754
    // Math.round(0.30000000000000004 * 100) / 100 = 0.3
    const builder = makeBuilder({
      data: [{ total_ht: 0.1 }, { total_ht: 0.2 }],
      error: null,
    })
    const supabase = makeSupabase(builder)

    const result = await getWeeklyRevenue(supabase)

    expect(result).toBe(0.3)
  })

  it("filters by week start date via gte", async () => {
    const builder = makeBuilder({ data: [], error: null })
    const supabase = makeSupabase(builder)
    const before = getWeekStart().toISOString()

    await getWeeklyRevenue(supabase)

    // The gte call should receive the Monday of the current week
    const gteCall = (builder.gte as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(gteCall[0]).toBe("created_at")
    expect(gteCall[1]).toBe(before)
  })
})

// ── getPendingMaterialsCount ──────────────────────────────────────────────────

describe("getPendingMaterialsCount", () => {
  it("returns count of pending material requests", async () => {
    const builder = makeBuilder({ count: 5, error: null })
    const supabase = makeSupabase(builder)

    const result = await getPendingMaterialsCount(supabase)

    expect(result).toBe(5)
    expect(builder.eq).toHaveBeenCalledWith("status", "pending")
  })

  it("returns 0 when count is null", async () => {
    const builder = makeBuilder({ count: null, error: null })
    const supabase = makeSupabase(builder)

    expect(await getPendingMaterialsCount(supabase)).toBe(0)
  })

  it("returns 0 on error", async () => {
    const builder = makeBuilder({ count: null, error: { message: "db error" } })
    const supabase = makeSupabase(builder)

    expect(await getPendingMaterialsCount(supabase)).toBe(0)
  })
})

// ── getOpenAlertsCount ────────────────────────────────────────────────────────

describe("getOpenAlertsCount", () => {
  it("returns count of open and in-progress alerts", async () => {
    const builder = makeBuilder({ count: 2, error: null })
    const supabase = makeSupabase(builder)

    const result = await getOpenAlertsCount(supabase)

    expect(result).toBe(2)
    expect(builder.in).toHaveBeenCalledWith("status", [
      "ouvert",
      "pris_en_charge",
    ])
  })

  it("returns 0 when count is null", async () => {
    const builder = makeBuilder({ count: null, error: null })
    const supabase = makeSupabase(builder)

    expect(await getOpenAlertsCount(supabase)).toBe(0)
  })

  it("returns 0 on error", async () => {
    const builder = makeBuilder({ count: null, error: { message: "db error" } })
    const supabase = makeSupabase(builder)

    expect(await getOpenAlertsCount(supabase)).toBe(0)
  })
})

// ── getDashboardMetrics ───────────────────────────────────────────────────────

describe("getDashboardMetrics", () => {
  it("fetches and combines all 6 metrics in parallel", async () => {
    // Promise.all calls supabase.from() 6 times in order:
    // 1. getPendingQuotesCount   → from("quotes")
    // 2. getActiveProjectsCount  → from("projects")
    // 3. getUnprocessedEmailsCount → from("email_statuses")
    // 4. getWeeklyRevenue        → from("quotes")
    // 5. getPendingMaterialsCount → from("materiaux_requests")
    // 6. getOpenAlertsCount      → from("alertes_terrain")
    const builders = [
      makeBuilder({ count: 4, error: null }),
      makeBuilder({ count: 2, error: null }),
      makeBuilder({ count: 8, error: null }),
      makeBuilder({ data: [{ total_ht: 5000 }, { total_ht: 3000 }], error: null }),
      makeBuilder({ count: 1, error: null }),
      makeBuilder({ count: 3, error: null }),
    ]
    const from = vi.fn()
    builders.forEach((b) => from.mockReturnValueOnce(b))
    const supabase = { from } as unknown as AnyClient

    const metrics = await getDashboardMetrics(supabase)

    expect(metrics.pendingQuotes).toBe(4)
    expect(metrics.activeProjects).toBe(2)
    expect(metrics.unprocessedEmails).toBe(8)
    expect(metrics.weeklyRevenue).toBe(8000)
    expect(metrics.pendingMaterials).toBe(1)
    expect(metrics.openAlerts).toBe(3)
  })

  it("returns zeros when all queries error", async () => {
    const errored = () =>
      makeBuilder({ count: null, error: { message: "fail" } })
    const builders = [errored(), errored(), errored(), errored(), errored(), errored()]
    const from = vi.fn()
    builders.forEach((b) => from.mockReturnValueOnce(b))

    // getWeeklyRevenue needs data not count
    builders[3] = makeBuilder({ data: null, error: { message: "fail" } })
    builders.forEach((b, i) => from.mockReturnValueOnce(builders[i]))

    const from2 = vi.fn()
    builders.forEach((b) => from2.mockReturnValueOnce(b))
    const supabase = { from: from2 } as unknown as AnyClient

    const metrics = await getDashboardMetrics(supabase)

    expect(metrics.pendingQuotes).toBe(0)
    expect(metrics.activeProjects).toBe(0)
    expect(metrics.unprocessedEmails).toBe(0)
    expect(metrics.weeklyRevenue).toBe(0)
    expect(metrics.pendingMaterials).toBe(0)
    expect(metrics.openAlerts).toBe(0)
  })
})
