// Tests for /inbox — email list, status management, client linking.
// Auth tests run unconditionally. Feature tests require
// CYPRESS_BUREAU_EMAIL + CYPRESS_BUREAU_PASSWORD env vars.

describe("Messagerie — /inbox", () => {
  describe("Auth guard", () => {
    it("redirige les utilisateurs non authentifiés vers /login", () => {
      cy.visit("/inbox", { failOnStatusCode: false })
      cy.url().should("include", "/login")
    })
  })

  describe("Navigation et interface", () => {
    before(function () {
      if (!Cypress.env("BUREAU_EMAIL") || !Cypress.env("BUREAU_PASSWORD")) {
        this.skip()
      }
    })

    beforeEach(() => {
      cy.session(
        "bureau-inbox",
        () => {
          cy.visit("/login")
          cy.get('input[type="email"]').type(
            Cypress.env("BUREAU_EMAIL") as string
          )
          cy.get('input[type="password"]').type(
            Cypress.env("BUREAU_PASSWORD") as string
          )
          cy.get('button[type="submit"]').click()
          cy.url().should("include", "/dashboard")
        },
        { cacheAcrossSpecs: true }
      )

      cy.visit("/inbox")
    })

    it("affiche le titre de la page", () => {
      cy.get("h1").should("contain.text", "Messagerie")
    })

    it("affiche les filtres de statut", () => {
      cy.get('[data-testid="status-filters"]').should("be.visible")
      cy.get('[data-testid="status-filter-all"]').should("exist")
      cy.get('[data-testid="status-filter-a_traiter"]').should("exist")
      cy.get('[data-testid="status-filter-en_cours"]').should("exist")
      cy.get('[data-testid="status-filter-repondu"]').should("exist")
      cy.get('[data-testid="status-filter-archive"]').should("exist")
    })

    it("affiche la bannière de connexion Gmail si aucune boîte n'est connectée ou la liste des emails", () => {
      cy.get("body").then(($body) => {
        if ($body.find('[data-testid="inbox-email-row"]').length > 0) {
          cy.get('[data-testid="inbox-email-row"]').should("exist")
        } else {
          cy.contains("Aucune boîte mail connectée").should("exist")
        }
      })
    })

    describe("Avec emails", () => {
      before(function () {
        cy.visit("/inbox")
        cy.get("body").then(($body) => {
          if ($body.find('[data-testid="inbox-email-row"]').length === 0) {
            this.skip()
          }
        })
      })

      it("sélectionne un email au clic et affiche le détail", () => {
        cy.get('[data-testid="inbox-email-row"]').first().click()
        cy.get('[data-testid="email-subject"]').should("exist")
        cy.get('[data-testid="status-selector"]').should("be.visible")
      })

      it("filtre les emails par statut À traiter", () => {
        cy.get('[data-testid="status-filter-a_traiter"]').click()
        cy.get('[data-testid="inbox-email-row"]').each(($row) => {
          cy.wrap($row).should("contain.text", "À traiter")
        })
      })

      it("réinitialise le filtre au second clic sur le même statut", () => {
        cy.get('[data-testid="inbox-email-row"]').then(($all) => {
          const total = $all.length

          cy.get('[data-testid="status-filter-en_cours"]').click()
          cy.get('[data-testid="status-filter-en_cours"]').click()

          cy.get('[data-testid="inbox-email-row"]').should(
            "have.length",
            total
          )
        })
      })

      it("filtre les emails via la recherche", () => {
        cy.get('[data-testid="inbox-search"]').type("aaazzzxxx-inexistant")
        cy.get('[data-testid="inbox-email-row"]').should("have.length", 0)
      })

      it("change le statut d'un email depuis le panneau détail", () => {
        cy.get('[data-testid="inbox-email-row"]').first().click()
        cy.get('[data-testid="status-selector"]').should("be.visible")

        cy.get('[data-testid="status-btn-en_cours"]').click()

        cy.get('[data-testid="status-btn-en_cours"]').should(
          "have.class",
          "ring-1"
        )

        cy.get('[data-testid="inbox-email-row"]').first().should(
          "contain.text",
          "En cours"
        )
      })

      it("peut archiver un email depuis le panneau détail", () => {
        cy.get('[data-testid="inbox-email-row"]').first().click()
        cy.get('[data-testid="status-btn-archive"]').click()

        cy.get('[data-testid="inbox-email-row"]').first().should(
          "contain.text",
          "Archivé"
        )
      })
    })
  })
})
