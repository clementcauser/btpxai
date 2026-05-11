import { describe, it, expect, vi, beforeEach } from "vitest"
import { getEvents, createEvent, updateEvent, deleteEvent } from "./calendar"

const mockFrom = vi.fn()
const supabase = { from: mockFrom } as any

beforeEach(() => vi.clearAllMocks())

describe("getEvents", () => {
  it("fetches events within date range for workspace", async () => {
    const events = [{ id: "ev-1", title: "Test", start_at: "2026-05-11T08:00:00Z", assignees: [] }]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: events, error: null }),
      }),
    })
    const result = await getEvents(supabase, "ws-1", {
      from: "2026-05-01T00:00:00Z",
      to: "2026-05-31T23:59:59Z",
    })
    expect(result).toEqual(events)
  })

  it("filters events client-side by assigneeId", async () => {
    const events = [
      { id: "ev-1", title: "E1", start_at: "2026-05-11T08:00:00Z", assignees: [{ user_id: "u-1" }] },
      { id: "ev-2", title: "E2", start_at: "2026-05-11T09:00:00Z", assignees: [{ user_id: "u-2" }] },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: events, error: null }),
      }),
    })
    const result = await getEvents(supabase, "ws-1", {
      from: "2026-05-01T00:00:00Z",
      to: "2026-05-31T23:59:59Z",
      assigneeId: "u-1",
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("ev-1")
  })
})

describe("createEvent", () => {
  it("inserts event and assignees", async () => {
    const created = { id: "new-ev", title: "Chantier" }
    mockFrom
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: created, error: null }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })
    const result = await createEvent(supabase, "ws-1", {
      title: "Chantier",
      start_at: "2026-05-11T08:00:00Z",
      end_at: "2026-05-11T17:00:00Z",
      assignee_ids: ["user-1"],
    })
    expect(result).toEqual(created)
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it("skips assignees insert if no assignee_ids", async () => {
    const created = { id: "new-ev", title: "Chantier" }
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: created, error: null }),
        }),
      }),
    })
    await createEvent(supabase, "ws-1", {
      title: "Chantier",
      start_at: "2026-05-11T08:00:00Z",
      end_at: "2026-05-11T17:00:00Z",
    })
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })
})

describe("deleteEvent", () => {
  it("deletes event by id", async () => {
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    mockFrom.mockReturnValue({ delete: deleteMock })
    await deleteEvent(supabase, "ev-1")
    expect(deleteMock).toHaveBeenCalledOnce()
  })
})
