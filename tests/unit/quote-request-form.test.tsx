import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps, ReactNode } from "react"
import { QuoteRequestForm } from "@/components/devis/quote-request-form"
import { toast } from "sonner"
import type { Client } from "@/types"

// ─── Mocks (hoisted above imports by Vitest) ──────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Avoid @base-ui portal issues in jsdom
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: ReactNode
    open: boolean
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogFooter: ({
    children,
  }: {
    children: ReactNode
    showCloseButton?: boolean
  }) => <div>{children}</div>,
}))

// Avoid @base-ui rendering issues in jsdom
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    className: _c,
    ...props
  }: ComponentProps<"button"> & { className?: string }) => (
    <button {...props}>{children}</button>
  ),
  buttonVariants: () => "",
}))

vi.mock("@/components/ui/input", () => ({
  Input: ({ className: _c, ...props }: ComponentProps<"input">) => (
    <input {...props} />
  ),
}))

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockClients: Client[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Dupont SA",
    email: "dupont@example.com",
    phone: "06 00 00 00 00",
    address: "1 rue de la Paix, 75001 Paris",
    created_at: "2026-01-01T00:00:00Z",
  },
]

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("QuoteRequestForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders all four form sections via their key fields", () => {
    render(<QuoteRequestForm clients={mockClients} />)
    // Each section is identified by its unique label
    expect(screen.getByLabelText("Client *")).toBeInTheDocument()
    expect(screen.getByLabelText("Description des travaux *")).toBeInTheDocument()
    expect(screen.getByLabelText("Délai souhaité *")).toBeInTheDocument()
    // Section 04 label appears in both the section header span and the field label
    expect(screen.getAllByText("Notes internes").length).toBeGreaterThanOrEqual(1)
  })

  it("populates the client select with provided clients", () => {
    render(<QuoteRequestForm clients={mockClients} />)
    expect(
      screen.getByRole("option", { name: "Dupont SA" })
    ).toBeInTheDocument()
  })

  it("shows validation errors on empty submit", async () => {
    const user = userEvent.setup()
    render(<QuoteRequestForm clients={mockClients} />)

    await user.click(screen.getByRole("button", { name: /générer le devis/i }))

    expect(
      await screen.findByText("Sélectionnez un client")
    ).toBeInTheDocument()
    expect(
      await screen.findByText(
        "Description trop courte (10 caractères minimum)"
      )
    ).toBeInTheDocument()
    expect(await screen.findByText("Délai requis")).toBeInTheDocument()
  })

  it("opens the new client dialog when clicking the + button", async () => {
    const user = userEvent.setup()
    render(<QuoteRequestForm clients={mockClients} />)

    await user.click(screen.getByTitle("Créer un nouveau client"))

    expect(screen.getByText("Nouveau client")).toBeInTheDocument()
    expect(screen.getByLabelText("Nom *")).toBeInTheDocument()
  })

  it("validates required name in the client creation dialog", async () => {
    const user = userEvent.setup()
    render(<QuoteRequestForm clients={mockClients} />)

    await user.click(screen.getByTitle("Créer un nouveau client"))
    await user.click(screen.getByRole("button", { name: /créer le client/i }))

    expect(
      await screen.findByText("Nom requis (2 caractères minimum)")
    ).toBeInTheDocument()
  })

  it("calls POST /api/devis/brief with correct payload on valid submit", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ quote_id: "q1" }),
    })
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(<QuoteRequestForm clients={mockClients} />)

    await user.selectOptions(
      screen.getByLabelText("Client *"),
      "00000000-0000-0000-0000-000000000001"
    )
    await user.type(
      screen.getByLabelText("Description des travaux *"),
      "Installation d'un portail coulissant en aluminium pour un garage individuel"
    )
    await user.type(screen.getByLabelText("Délai souhaité *"), "3 semaines")

    await user.click(screen.getByRole("button", { name: /générer le devis/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/devis/brief",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"delai":"3 semaines"'),
        })
      )
    })
  })

  it("shows an error toast when the API call fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ error: "Erreur lors de la création du projet" }),
    })

    const user = userEvent.setup()
    render(<QuoteRequestForm clients={mockClients} />)

    await user.selectOptions(
      screen.getByLabelText("Client *"),
      "00000000-0000-0000-0000-000000000001"
    )
    await user.type(
      screen.getByLabelText("Description des travaux *"),
      "Installation d'un portail coulissant en aluminium pour un garage individuel"
    )
    await user.type(screen.getByLabelText("Délai souhaité *"), "3 semaines")

    await user.click(screen.getByRole("button", { name: /générer le devis/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors de la création du projet"
      )
    })
  })
})
