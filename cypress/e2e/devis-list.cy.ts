// Tests for /devis — paginated table, filters, quick actions.
// Auth tests run unconditionally. Table/filter/action tests require
// CYPRESS_BUREAU_EMAIL + CYPRESS_BUREAU_PASSWORD env vars.

describe("Devis list — /devis", () => {
  describe("Auth guard", () => {
    it("redirige les utilisateurs non authentifiés vers /login", () => {
      cy.visit("/devis", { failOnStatusCode: false })
      cy.url().should("include", "/login")
    })
  })

  describe("Navigation et filtres", () => {
    before(function () {
      if (!Cypress.env("BUREAU_EMAIL") || !Cypress.env("BUREAU_PASSWORD")) {
        this.skip()
      }
    })

    beforeEach(() => {
      cy.session(
        "bureau",
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

      cy.visit("/devis")
    })

    it("affiche le titre de la page", () => {
      cy.get("h1").should("contain.text", "Devis")
    })

    it("affiche le tableau des devis", () => {
      cy.get('[data-testid="quotes-table"]').should("exist")
    })

    it("affiche les boutons de filtre par statut", () => {
      cy.get('[data-testid="status-filters"]').should("be.visible")
      cy.get('[data-testid="status-filter-draft"]').should("exist")
      cy.get('[data-testid="status-filter-sent"]').should("exist")
      cy.get('[data-testid="status-filter-accepted"]').should("exist")
      cy.get('[data-testid="status-filter-rejected"]').should("exist")
      cy.get('[data-testid="status-filter-expired"]').should("exist")
    })

    it("filtre les devis par statut au clic", () => {
      cy.get('[data-testid="quotes-table-row"]').then(($allRows) => {
        const totalRows = $allRows.length
        if (totalRows === 0) return

        cy.get('[data-testid="status-filter-draft"]').click()

        cy.get('[data-testid="quotes-table-row"]').each(($row) => {
          cy.wrap($row)
            .find('[data-testid="status-badge"]')
            .should("have.attr", "data-status", "draft")
        })
      })
    })

    it("efface les filtres de statut après un second clic", () => {
      cy.get('[data-testid="quotes-table-row"]').then(($allRows) => {
        const totalBefore = $allRows.length
        if (totalBefore === 0) return

        cy.get('[data-testid="status-filter-sent"]').click()
        cy.get('[data-testid="status-filter-sent"]').click()

        cy.get('[data-testid="quotes-table-row"]').should(
          "have.length",
          totalBefore
        )
      })
    })

    it("filtre les devis par recherche", () => {
      cy.get('[data-testid="search-input"]').type("inexistant-xyz-123")
      cy.get('[data-testid="quotes-table-row"]').should("have.length", 0)
      cy.get('[data-testid="quotes-table"]').should(
        "contain.text",
        "Aucun devis trouvé"
      )
    })

    it("efface les filtres avec le bouton Effacer", () => {
      cy.get('[data-testid="search-input"]').type("inexistant-xyz-123")
      cy.get('[data-testid="clear-filters"]').click()
      cy.get('[data-testid="search-input"]').should("have.value", "")
    })

    it("navigue vers la page de prévisualisation au clic sur la référence", () => {
      cy.get('[data-testid="quotes-table-row"]').then(($rows) => {
        if ($rows.length === 0) return

        cy.get('[data-testid="quotes-table-row"]')
          .first()
          .find('[data-testid="action-view"]')
          .click()

        cy.url().should("match", /\/devis\/.+\/preview/)
      })
    })

    it("affiche les actions rapides sur chaque ligne", () => {
      cy.get('[data-testid="quotes-table-row"]').then(($rows) => {
        if ($rows.length === 0) return

        cy.get('[data-testid="quotes-table-row"]')
          .first()
          .within(() => {
            cy.get('[data-testid="action-send"]').should("exist")
            cy.get('[data-testid="action-duplicate"]').should("exist")
            cy.get('[data-testid="action-archive"]').should("exist")
          })
      })
    })

    it("affiche le bouton Nouveau devis", () => {
      cy.contains("a", "Nouveau devis").should(
        "have.attr",
        "href",
        "/devis/nouveau"
      )
    })
  })
})
