describe("Quote request form — /devis/nouveau", () => {
  // Test the form UI and validation without requiring live auth/DB
  describe("Form structure", () => {
    beforeEach(() => {
      // Intercept auth check to simulate authenticated session
      cy.intercept("GET", "/api/auth/**", { statusCode: 200 }).as("auth")

      // Intercept clients fetch (server-rendered page — test against the rendered HTML)
      cy.visit("/devis/nouveau", { failOnStatusCode: false })
    })

    it("renders the page title", () => {
      cy.contains("Nouveau brief").should("be.visible")
    })

    it("renders all four form sections", () => {
      cy.contains("Client").should("be.visible")
      cy.contains("Travaux").should("be.visible")
      cy.contains("Logistique").should("be.visible")
      cy.contains("Notes internes").should("be.visible")
    })

    it("renders the submit button", () => {
      cy.contains("Générer le devis").should("be.visible")
    })
  })

  describe("Client-side validation", () => {
    beforeEach(() => {
      cy.visit("/devis/nouveau", { failOnStatusCode: false })
    })

    it("shows validation errors when submitting empty form", () => {
      cy.get('button[type="submit"]').click()
      cy.contains("Sélectionnez un client").should("be.visible")
      cy.contains("Description trop courte").should("be.visible")
      cy.contains("Délai requis").should("be.visible")
    })

    it("shows description length error for short input", () => {
      cy.get("#travaux_description").type("Court")
      cy.get('button[type="submit"]').click()
      cy.contains("Description trop courte").should("be.visible")
    })
  })

  describe("New client dialog", () => {
    beforeEach(() => {
      cy.visit("/devis/nouveau", { failOnStatusCode: false })
    })

    it("opens the new client dialog when clicking the + button", () => {
      cy.get('button[title="Créer un nouveau client"]').click()
      cy.contains("Nouveau client").should("be.visible")
      cy.get("#new-client-name").should("be.visible")
      cy.get("#new-client-email").should("be.visible")
      cy.get("#new-client-phone").should("be.visible")
    })

    it("validates required name field in the dialog", () => {
      cy.get('button[title="Créer un nouveau client"]').click()
      cy.contains("Créer le client").click()
      cy.contains("Nom requis").should("be.visible")
    })

    it("closes the dialog on cancel", () => {
      cy.get('button[title="Créer un nouveau client"]').click()
      cy.contains("Nouveau client").should("be.visible")
      // Click the close button in the dialog
      cy.get('[data-slot="dialog-close"]').click()
      cy.contains("Nouveau client").should("not.exist")
    })
  })

  describe("Form submission (with API mocking)", () => {
    beforeEach(() => {
      cy.visit("/devis/nouveau", { failOnStatusCode: false })
    })

    it("submits the form and shows success toast on 201", () => {
      cy.intercept("POST", "/api/devis/brief", {
        statusCode: 201,
        body: { quote_id: "00000000-0000-0000-0000-000000000001" },
      }).as("submitBrief")

      // Select needs a value — seed a dummy option via page manipulation
      // In a real E2E test with seeded DB, the client select would have options
      // Here we programmatically set the value to bypass the required client_id
      cy.get("#client_id").then(($select) => {
        // Add a dummy option for testing
        const option = document.createElement("option")
        option.value = "00000000-0000-0000-0000-000000000099"
        option.text = "Client test"
        $select[0].appendChild(option)
      })
      cy.get("#client_id").select("Client test")

      cy.get("#travaux_description").type(
        "Installation d'un portail coulissant en aluminium pour un garage individuel avec automatisme"
      )
      cy.get("#delai").type("3 semaines")

      cy.get('button[type="submit"]').click()
      cy.wait("@submitBrief")

      cy.contains("Brief enregistré").should("be.visible")
    })

    it("shows error toast when API returns 500", () => {
      cy.intercept("POST", "/api/devis/brief", {
        statusCode: 500,
        body: { error: "Erreur lors de la création du projet" },
      }).as("submitError")

      cy.get("#client_id").then(($select) => {
        const option = document.createElement("option")
        option.value = "00000000-0000-0000-0000-000000000099"
        option.text = "Client test"
        $select[0].appendChild(option)
      })
      cy.get("#client_id").select("Client test")

      cy.get("#travaux_description").type(
        "Installation d'un portail coulissant en aluminium pour un garage individuel avec automatisme"
      )
      cy.get("#delai").type("3 semaines")

      cy.get('button[type="submit"]').click()
      cy.wait("@submitError")

      cy.contains("Erreur lors de la création du projet").should("be.visible")
    })
  })
})
