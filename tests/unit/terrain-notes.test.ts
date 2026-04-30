import { describe, it, expect, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { getTerrainNotes, createTerrainNote } from "@/lib/terrain-notes"

type Supabase = SupabaseClient<Database>

function makeBuilder(result: { data: unknown; error: null | object }) {
  const builder: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
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

const mockNote = {
  id: "n1",
  project_id: "p1",
  user_id: "u1",
  transcription: "Besoin de rallonges électriques",
  audio_url: null,
  created_at: "2026-04-30T09:00:00Z",
}

describe("getTerrainNotes", () => {
  it("returns notes for a project ordered by created_at desc", async () => {
    const builder = makeBuilder({ data: [mockNote], error: null })
    const supabase = makeSupabase(builder)

    const result = await getTerrainNotes(supabase, "p1")

    expect(supabase.from).toHaveBeenCalledWith("terrain_notes")
    expect(builder.eq).toHaveBeenCalledWith("project_id", "p1")
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false })
    expect(result).toEqual([mockNote])
  })

  it("throws when Supabase returns an error", async () => {
    const dbError = { message: "DB error", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(getTerrainNotes(supabase, "p1")).rejects.toEqual(dbError)
  })
})

describe("createTerrainNote", () => {
  it("inserts a note and returns the saved row", async () => {
    const builder = makeBuilder({ data: mockNote, error: null })
    const supabase = makeSupabase(builder)

    const result = await createTerrainNote(supabase, {
      project_id: "p1",
      user_id: "u1",
      transcription: "Besoin de rallonges électriques",
      audio_url: null,
    })

    expect(supabase.from).toHaveBeenCalledWith("terrain_notes")
    expect(builder.insert).toHaveBeenCalledWith({
      project_id: "p1",
      user_id: "u1",
      transcription: "Besoin de rallonges électriques",
      audio_url: null,
    })
    expect(builder.single).toHaveBeenCalled()
    expect(result).toEqual(mockNote)
  })

  it("throws when insert fails", async () => {
    const dbError = { message: "Insert failed", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(
      createTerrainNote(supabase, {
        project_id: "p1",
        user_id: "u1",
        transcription: "test",
        audio_url: null,
      })
    ).rejects.toEqual(dbError)
  })
})
