import { describe, it, expect, vi, beforeEach } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import type { Quote, QuoteItem } from "@/types"
import {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  addQuoteItem,
  updateQuoteItem,
  deleteQuoteItem,
} from "@/lib/quotes"

type Supabase = SupabaseClient<Database>

// Creates a Supabase-like fluent query builder whose terminal await resolves to `result`.
// Every intermediate method (.select, .insert, .update, .delete, .eq, .order, .single)
// returns the same object so chaining works. The object is thenable so awaiting any
// step in the chain resolves to `result`.
function makeBuilder(result: { data: unknown; error: null | object }) {
  const builder: Record<string, unknown> = {
    then: (
      resolve: (v: unknown) => unknown,
      reject?: (r: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject),
  }

  for (const method of [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "order",
    "single",
  ]) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  return builder
}

function makeSupabase(...builders: ReturnType<typeof makeBuilder>[]) {
  const from = vi.fn()
  builders.forEach((b) => from.mockReturnValueOnce(b))
  return { from } as unknown as Supabase
}

// ─── fixtures ────────────────────────────────────────────────────────────────

const mockQuote: Quote = {
  id: "q1",
  project_id: "p1",
  status: "draft",
  total_ht: 0,
  tva_rate: 20,
  notes: null,
  validity_days: 30,
  reference: null,
  created_at: "2026-04-27T00:00:00Z",
  sent_at: null,
}

const mockItem: QuoteItem = {
  id: "i1",
  quote_id: "q1",
  label: "Cornière acier",
  quantity: 2,
  unit_price: 45,
  unit: "m",
}

// ─── getQuotes ────────────────────────────────────────────────────────────────

describe("getQuotes", () => {
  it("returns list of quotes ordered by created_at desc", async () => {
    const builder = makeBuilder({ data: [mockQuote], error: null })
    const supabase = makeSupabase(builder)

    const result = await getQuotes(supabase)

    expect(supabase.from).toHaveBeenCalledWith("quotes")
    expect(builder.select).toHaveBeenCalledWith("*")
    expect(builder.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    })
    expect(result).toEqual([mockQuote])
  })

  it("throws when Supabase returns an error", async () => {
    const dbError = { message: "DB error", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(getQuotes(supabase)).rejects.toEqual(dbError)
  })
})

// ─── getQuote ─────────────────────────────────────────────────────────────────

describe("getQuote", () => {
  it("returns a quote with its items", async () => {
    const quoteWithItems = { ...mockQuote, items: [mockItem] }
    const builder = makeBuilder({ data: quoteWithItems, error: null })
    const supabase = makeSupabase(builder)

    const result = await getQuote(supabase, "q1")

    expect(builder.eq).toHaveBeenCalledWith("id", "q1")
    expect(builder.single).toHaveBeenCalled()
    expect(result).toEqual(quoteWithItems)
  })

  it("throws when quote is not found", async () => {
    const notFound = { message: "Row not found", code: "PGRST116" }
    const builder = makeBuilder({ data: null, error: notFound })
    const supabase = makeSupabase(builder)

    await expect(getQuote(supabase, "missing")).rejects.toEqual(notFound)
  })
})

// ─── createQuote ──────────────────────────────────────────────────────────────

describe("createQuote", () => {
  it("inserts a quote and returns it", async () => {
    const builder = makeBuilder({ data: mockQuote, error: null })
    const supabase = makeSupabase(builder)

    const input = { project_id: "p1", tva_rate: 20, validity_days: 30 }
    const result = await createQuote(supabase, input)

    expect(builder.insert).toHaveBeenCalledWith(input)
    expect(builder.single).toHaveBeenCalled()
    expect(result).toEqual(mockQuote)
  })

  it("throws on insert error", async () => {
    const dbError = { message: "Insert failed", code: "23503" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(
      createQuote(supabase, { project_id: "p1" })
    ).rejects.toEqual(dbError)
  })
})

// ─── updateQuote ──────────────────────────────────────────────────────────────

describe("updateQuote", () => {
  it("updates a quote and returns the updated row", async () => {
    const updated = { ...mockQuote, notes: "Travaux urgents" }
    const builder = makeBuilder({ data: updated, error: null })
    const supabase = makeSupabase(builder)

    const result = await updateQuote(supabase, "q1", {
      notes: "Travaux urgents",
    })

    expect(builder.update).toHaveBeenCalledWith({ notes: "Travaux urgents" })
    expect(builder.eq).toHaveBeenCalledWith("id", "q1")
    expect(result).toEqual(updated)
  })

  it("throws on update error", async () => {
    const dbError = { message: "Update failed", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(
      updateQuote(supabase, "q1", { status: "sent" })
    ).rejects.toEqual(dbError)
  })
})

// ─── deleteQuote ──────────────────────────────────────────────────────────────

describe("deleteQuote", () => {
  it("deletes a quote without returning data", async () => {
    const builder = makeBuilder({ data: null, error: null })
    const supabase = makeSupabase(builder)

    await expect(deleteQuote(supabase, "q1")).resolves.toBeUndefined()
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith("id", "q1")
  })

  it("throws on delete error", async () => {
    const dbError = { message: "Delete failed", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(deleteQuote(supabase, "q1")).rejects.toEqual(dbError)
  })
})

// ─── addQuoteItem ─────────────────────────────────────────────────────────────

describe("addQuoteItem", () => {
  beforeEach(() => vi.clearAllMocks())

  it("inserts an item and recalculates the quote total", async () => {
    const itemBuilder = makeBuilder({ data: mockItem, error: null })
    const itemsForRecalc = makeBuilder({
      data: [{ quantity: 2, unit_price: 45 }],
      error: null,
    })
    const quoteUpdate = makeBuilder({ data: null, error: null })
    const supabase = makeSupabase(itemBuilder, itemsForRecalc, quoteUpdate)

    const input = {
      quote_id: "q1",
      label: "Cornière acier",
      quantity: 2,
      unit_price: 45,
      unit: "m",
    }
    const result = await addQuoteItem(supabase, input)

    expect(result).toEqual(mockItem)
    // recalc: fetched items and updated total
    expect(itemsForRecalc.eq).toHaveBeenCalledWith("quote_id", "q1")
    expect(quoteUpdate.update).toHaveBeenCalledWith({ total_ht: 90 })
  })

  it("throws when the item insert fails", async () => {
    const dbError = { message: "Insert failed", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(
      addQuoteItem(supabase, {
        quote_id: "q1",
        label: "Test",
        quantity: 1,
        unit_price: 10,
      })
    ).rejects.toEqual(dbError)
  })
})

// ─── updateQuoteItem ──────────────────────────────────────────────────────────

describe("updateQuoteItem", () => {
  it("updates an item and recalculates the quote total", async () => {
    const updatedItem = { ...mockItem, quantity: 5 }
    const itemBuilder = makeBuilder({ data: updatedItem, error: null })
    const itemsForRecalc = makeBuilder({
      data: [{ quantity: 5, unit_price: 45 }],
      error: null,
    })
    const quoteUpdate = makeBuilder({ data: null, error: null })
    const supabase = makeSupabase(itemBuilder, itemsForRecalc, quoteUpdate)

    const result = await updateQuoteItem(supabase, "i1", "q1", { quantity: 5 })

    expect(result).toEqual(updatedItem)
    expect(quoteUpdate.update).toHaveBeenCalledWith({ total_ht: 225 })
  })

  it("throws when the item update fails", async () => {
    const dbError = { message: "Update failed", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(
      updateQuoteItem(supabase, "i1", "q1", { quantity: 5 })
    ).rejects.toEqual(dbError)
  })
})

// ─── deleteQuoteItem ──────────────────────────────────────────────────────────

describe("deleteQuoteItem", () => {
  it("deletes an item and recalculates the quote total", async () => {
    const itemBuilder = makeBuilder({ data: null, error: null })
    const itemsForRecalc = makeBuilder({ data: [], error: null })
    const quoteUpdate = makeBuilder({ data: null, error: null })
    const supabase = makeSupabase(itemBuilder, itemsForRecalc, quoteUpdate)

    await expect(
      deleteQuoteItem(supabase, "i1", "q1")
    ).resolves.toBeUndefined()

    // total should be 0 when no items remain
    expect(quoteUpdate.update).toHaveBeenCalledWith({ total_ht: 0 })
  })

  it("throws when the item delete fails", async () => {
    const dbError = { message: "Delete failed", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(
      deleteQuoteItem(supabase, "i1", "q1")
    ).rejects.toEqual(dbError)
  })
})
