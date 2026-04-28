// Requires CYPRESS_TEST_QUOTE_ID env var pointing to a draft quote with at least one item.
// e.g. CYPRESS_TEST_QUOTE_ID=<uuid> npx cypress run

describe("Devis Preview — /devis/[id]/preview", () => {
  describe("Auth guard", () => {
    it("redirige les utilisateurs non authentifiés vers /login", () => {
      cy.visit("/devis/00000000-0000-0000-0000-000000000000/preview", {
        failOnStatusCode: false,
      })
      cy.url().should("include", "/login")
    })
  })

  describe("Édition des lignes", () => {
    const quoteId = Cypress.env("TEST_QUOTE_ID") as string

    before(function () {
      if (!quoteId) {
        this.skip()
      }
    })

    beforeEach(() => {
      // Authentification via session bureau
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

      cy.visit(`/devis/${quoteId}/preview`)
      cy.get('[data-testid="item-label-0"]').should("be.visible")
    })

    it("modifie une quantité et vérifie le recalcul du total de la ligne", () => {
      // Récupère le prix unitaire de la première ligne
      cy.get('[data-testid="item-unit-price-0"]')
        .invoke("val")
        .then((rawPrice) => {
          const unitPrice = parseFloat(String(rawPrice)) || 0
          const newQty = 5
          const expectedLineTotal = newQty * unitPrice

          // Modifie la quantité
          cy.get('[data-testid="item-quantity-0"]').clear().type(String(newQty))

          // Le total de la ligne se recalcule immédiatement
          cy.get('[data-testid="item-total-0"]').should((el) => {
            const text = el.text().replace(/\s/g, "").replace(",", ".")
            const value = parseFloat(text.replace(/[^\d.]/g, ""))
            expect(value).to.be.closeTo(expectedLineTotal, 0.01)
          })
        })
    })

    it("modifie un prix unitaire et vérifie le recalcul du total H.T.", () => {
      cy.get('[data-testid="quote-total-ht"]')
        .invoke("text")
        .then((initialTotal) => {
          // Change le prix unitaire de la première ligne
          cy.get('[data-testid="item-unit-price-0"]').clear().type("999")

          // Le total H.T. global doit changer
          cy.get('[data-testid="quote-total-ht"]')
            .invoke("text")
            .should("not.equal", initialTotal)
        })
    })

    it("ajoute une ligne et vérifie l'impact sur le total H.T.", () => {
      cy.get('[data-testid="quote-total-ht"]')
        .invoke("text")
        .then((initialTotal) => {
          cy.get('[data-testid="add-item-button"]').click()

          // Remplit la nouvelle ligne (dernière)
          cy.get('[data-testid^="item-label-"]').last().type("Nouvelle prestation")
          cy.get('[data-testid^="item-quantity-"]').last().clear().type("2")
          cy.get('[data-testid^="item-unit-price-"]').last().clear().type("150")

          // Le total de la nouvelle ligne doit être 300 €
          cy.get('[data-testid^="item-total-"]').last().should((el) => {
            const value = parseFloat(
              el.text().replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, "")
            )
            expect(value).to.be.closeTo(300, 0.01)
          })

          // Le total H.T. global doit avoir augmenté
          cy.get('[data-testid="quote-total-ht"]')
            .invoke("text")
            .should("not.equal", initialTotal)
        })
    })

    it("supprime une ligne et vérifie le recalcul du total H.T.", () => {
      // N'exécute ce test que s'il y a au moins 2 lignes
      cy.get('[data-testid^="item-label-"]').then(($rows) => {
        if ($rows.length < 2) return

        cy.get('[data-testid="quote-total-ht"]')
          .invoke("text")
          .then((initialTotal) => {
            cy.get('[data-testid="delete-item-0"]').click()

            cy.get('[data-testid="quote-total-ht"]')
              .invoke("text")
              .should("not.equal", initialTotal)
          })
      })
    })

    it("affiche le badge 'Modifications non sauvegardées' après une modification", () => {
      cy.get('[data-testid="item-quantity-0"]').clear().type("7")
      cy.contains("Modifications non sauvegardées").should("be.visible")
    })
  })
})
