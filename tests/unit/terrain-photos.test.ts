import { describe, it, expect, vi } from "vitest"
import { getTerrainPhotos, createTerrainPhoto } from "@/lib/terrain-photos"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

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
  return { from } as AnySupabase
}

const mockPhoto = {
  id: "ph1",
  project_id: "p1",
  user_id: "u1",
  photo_url: "https://storage.example.com/terrain-photos/p1/ph1.jpg",
  lat: 48.8566,
  lng: 2.3522,
  created_at: "2026-04-30T10:00:00Z",
}

const mockPhotoNoGeo = {
  ...mockPhoto,
  id: "ph2",
  lat: null,
  lng: null,
}

describe("getTerrainPhotos", () => {
  it("returns photos for a project ordered by created_at desc", async () => {
    const builder = makeBuilder({ data: [mockPhoto, mockPhotoNoGeo], error: null })
    const supabase = makeSupabase(builder)

    const result = await getTerrainPhotos(supabase, "p1")

    expect(supabase.from).toHaveBeenCalledWith("terrain_photos")
    expect(builder.eq).toHaveBeenCalledWith("project_id", "p1")
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false })
    expect(result).toEqual([mockPhoto, mockPhotoNoGeo])
  })

  it("returns an empty array when no photos exist", async () => {
    const builder = makeBuilder({ data: [], error: null })
    const supabase = makeSupabase(builder)

    const result = await getTerrainPhotos(supabase, "p1")

    expect(result).toEqual([])
  })

  it("throws when Supabase returns an error", async () => {
    const dbError = { message: "DB error", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(getTerrainPhotos(supabase, "p1")).rejects.toEqual(dbError)
  })
})

describe("createTerrainPhoto", () => {
  it("inserts a photo with geo and returns the saved row", async () => {
    const builder = makeBuilder({ data: mockPhoto, error: null })
    const supabase = makeSupabase(builder)

    const result = await createTerrainPhoto(supabase, "ws1", {
      project_id: "p1",
      user_id: "u1",
      photo_url: "https://storage.example.com/terrain-photos/p1/ph1.jpg",
      lat: 48.8566,
      lng: 2.3522,
    })

    expect(supabase.from).toHaveBeenCalledWith("terrain_photos")
    expect(builder.insert).toHaveBeenCalledWith({
      project_id: "p1",
      user_id: "u1",
      photo_url: "https://storage.example.com/terrain-photos/p1/ph1.jpg",
      lat: 48.8566,
      lng: 2.3522,
      workspace_id: "ws1",
    })
    expect(builder.single).toHaveBeenCalled()
    expect(result).toEqual(mockPhoto)
  })

  it("inserts a photo without geo (lat/lng null)", async () => {
    const builder = makeBuilder({ data: mockPhotoNoGeo, error: null })
    const supabase = makeSupabase(builder)

    const result = await createTerrainPhoto(supabase, "ws1", {
      project_id: "p1",
      user_id: "u1",
      photo_url: "https://storage.example.com/terrain-photos/p1/ph2.jpg",
      lat: null,
      lng: null,
    })

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ lat: null, lng: null, workspace_id: "ws1" })
    )
    expect(result).toEqual(mockPhotoNoGeo)
  })

  it("throws when insert fails", async () => {
    const dbError = { message: "Insert failed", code: "500" }
    const builder = makeBuilder({ data: null, error: dbError })
    const supabase = makeSupabase(builder)

    await expect(
      createTerrainPhoto(supabase, "ws1", {
        project_id: "p1",
        user_id: "u1",
        photo_url: "https://storage.example.com/terrain-photos/p1/ph1.jpg",
        lat: null,
        lng: null,
      })
    ).rejects.toEqual(dbError)
  })
})
