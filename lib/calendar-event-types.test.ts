import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getEventTypes,
  createEventType,
  updateEventType,
  deleteEventType,
  seedDefaultEventTypes,
} from "./calendar-event-types"

const mockFrom = vi.fn()
const supabase = { from: mockFrom } as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getEventTypes", () => {
  it("returns event types for workspace", async () => {
    const types = [{ id: "1", label: "Chantier", color: "#3b82f6" }]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: types, error: null }),
        }),
      }),
    })
    const result = await getEventTypes(supabase, "ws-1")
    expect(result).toEqual(types)
  })
})

describe("createEventType", () => {
  it("inserts a new event type", async () => {
    const created = { id: "new-id", label: "Livraison", color: "#f97316" }
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: created, error: null }),
        }),
      }),
    })
    const result = await createEventType(supabase, "ws-1", {
      label: "Livraison",
      color: "#f97316",
    })
    expect(result).toEqual(created)
  })
})

describe("deleteEventType", () => {
  it("throws if type is used by an event", async () => {
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [{ id: "ev-1" }], error: null }),
          }),
        }),
      })
    await expect(deleteEventType(supabase, "type-id")).rejects.toThrow(
      "Ce type est utilisé par des événements existants"
    )
  })
})

describe("seedDefaultEventTypes", () => {
  it("inserts 9 default event types", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: insertMock })
    await seedDefaultEventTypes(supabase, "ws-1")
    expect(insertMock).toHaveBeenCalledOnce()
    const rows = insertMock.mock.calls[0][0]
    expect(rows).toHaveLength(9)
    expect(rows[0].workspace_id).toBe("ws-1")
    expect(rows[0].is_preset).toBe(true)
  })
})
