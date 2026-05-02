import { describe, it, expect, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import type { Client } from "@/types"
import { getClients, getClient, createClient } from "@/lib/clients"

type Supabase = SupabaseClient<Database>

function makeBuilder(result: { data: unknown; error: null | object }) {
  const builder: Record<string, unknown> = {
    then: (
      resolve: (v: unknown) => unknown,
      reject?: (r: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject),
  }
  for (const method of ["select", "insert", "eq", "order", "single"]) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }
  return builder
}

function makeSupabase(...builders: ReturnType<typeof makeBuilder>[]) {
  const from = vi.fn()
  builders.forEach((b) => from.mockReturnValueOnce(b))
  return { from } as unknown as Supabase
}

const mockClient: Client = {
  id: "c1",
  name: "Dupont SA",
  email: "dupont@example.com",
  phone: "06 00 00 00 00",
  address: "1 rue de la Paix, 75001 Paris",
  created_at: "2026-04-27T00:00:00Z",
}

// ─── getClients ───────────────────────────────────────────────────────────────

describe("getClients", () => {
  it("returns clients ordered by name ascending", async () => {
    const builder = makeBuilder({ data: [mockClient], error: null })
    const supabase = makeSupabase(builder)

    const result = await getClients(supabase)

    expect(supabase.from).toHaveBeenCalledWith("clients")
    expect(builder.select).toHaveBeenCalledWith("*")
    expect(builder.order).toHaveBeenCalledWith("name", { ascending: true })
    expect(result).toEqual([mockClient])
  })

  it("throws when Supabase returns an error", async () => {
    const dbError = { message: "DB error", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(getClients(supabase)).rejects.toEqual(dbError)
  })
})

// ─── getClient ────────────────────────────────────────────────────────────────

describe("getClient", () => {
  it("returns a single client by id", async () => {
    const builder = makeBuilder({ data: mockClient, error: null })
    const supabase = makeSupabase(builder)

    const result = await getClient(supabase, "c1")

    expect(builder.eq).toHaveBeenCalledWith("id", "c1")
    expect(builder.single).toHaveBeenCalled()
    expect(result).toEqual(mockClient)
  })

  it("throws when client is not found", async () => {
    const notFound = { message: "Row not found", code: "PGRST116" }
    const builder = makeBuilder({ data: null, error: notFound })
    const supabase = makeSupabase(builder)

    await expect(getClient(supabase, "missing")).rejects.toEqual(notFound)
  })
})

// ─── createClient ─────────────────────────────────────────────────────────────

describe("createClient", () => {
  it("inserts a client and returns it", async () => {
    const builder = makeBuilder({ data: mockClient, error: null })
    const supabase = makeSupabase(builder)

    const input = { name: "Dupont SA", email: "dupont@example.com" }
    const result = await createClient(supabase, "ws1", input)

    expect(builder.insert).toHaveBeenCalledWith({ ...input, workspace_id: "ws1" })
    expect(builder.single).toHaveBeenCalled()
    expect(result).toEqual(mockClient)
  })

  it("throws on insert error", async () => {
    const dbError = { message: "Insert failed", code: "23505" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(
      createClient(supabase, "ws1", { name: "Test" })
    ).rejects.toEqual(dbError)
  })
})
