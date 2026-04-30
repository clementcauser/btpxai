/**
 * Alertes terrain — E2E tests
 *
 * Covers:
 * 1. Quick alert button visible on terrain home
 * 2. Opening the sheet, filling urgency + description, submitting (mocked API)
 * 3. ProblemeTab in project detail submits an alert
 * 4. Bureau /alertes page shows alerts and allows status updates
 *
 * All suites run on 375×812 (iPhone SE) for mobile parity.
 */
describe("Alertes terrain — bouton d'alerte rapide", () => {
  const MOBILE = { width: 375, height: 812 } as const

  beforeEach(() => {
    cy.viewport(MOBILE.width, MOBILE.height)
  })

  // ─── Quick alert button on terrain home ──────────────────────────────────────

  describe("Page d'accueil /terrain — bouton Signaler une alerte", () => {
    beforeEach(() => {
      cy.loginAsOuvrier()
      cy.visit("/terrain")
    })

    it("le bouton est visible dans le footer", () => {
      cy.get("[data-testid='quick-alert-button']").should("be.visible")
    })

    it("le bouton a une hauteur ≥ 48px", () => {
      cy.get("[data-testid='quick-alert-button']").should(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(48)
      })
    })

    it("ouvre le sheet au tap", () => {
      cy.get("[data-testid='quick-alert-button']").click()
      cy.get("[data-testid='submit-quick-alert']").should("be.visible")
    })

    it("le bouton soumettre est désactivé sans saisie", () => {
      cy.get("[data-testid='quick-alert-button']").click()
      cy.get("[data-testid='submit-quick-alert']").should("be.disabled")
    })

    it("s'active après choix urgence + description", () => {
      cy.get("[data-testid='quick-alert-button']").click()
      cy.get("[data-testid='quick-urgency-elevee']").click()
      cy.get("[data-testid='quick-alert-description']").type("Fissure dans la soudure principale")
      cy.get("[data-testid='submit-quick-alert']").should("not.be.disabled")
    })

    it("soumet l'alerte et affiche la confirmation (API mockée)", () => {
      cy.intercept("POST", "/api/terrain/alertes", {
        statusCode: 201,
        body: {
          alerte: {
            id: "alerte-test-1",
            project_id: null,
            user_id: "test-user-id",
            urgency: "critique",
            description: "Arrêt chantier — effondrement partiel du coffrage",
            photo_url: null,
            status: "ouvert",
            created_at: new Date().toISOString(),
          },
        },
      }).as("postAlerte")

      cy.get("[data-testid='quick-alert-button']").click()
      cy.get("[data-testid='quick-urgency-critique']").click()
      cy.get("[data-testid='quick-alert-description']").type(
        "Arrêt chantier — effondrement partiel du coffrage"
      )
      cy.get("[data-testid='submit-quick-alert']").click()
      cy.wait("@postAlerte")

      // Confirmation screen visible
      cy.contains("Alerte envoyée").should("be.visible")
    })

    it("ferme le sheet avec le bouton de fermeture", () => {
      cy.get("[data-testid='quick-alert-button']").click()
      cy.get("[data-testid='close-alert-sheet']").click()
      cy.get("[data-testid='submit-quick-alert']").should("not.exist")
    })
  })

  // ─── ProblemeTab in project detail ───────────────────────────────────────────

  describe("Onglet Problème (page projet) — soumission réelle", () => {
    const TEST_PROJECT_ID = "test-project-id"

    beforeEach(() => {
      cy.intercept("GET", "/api/project-steps*", {
        statusCode: 200,
        body: { steps: [] },
      }).as("getSteps")

      cy.intercept("POST", "/api/terrain/alertes", {
        statusCode: 201,
        body: {
          alerte: {
            id: "alerte-test-2",
            project_id: TEST_PROJECT_ID,
            user_id: "test-user-id",
            urgency: "elevee",
            description: "Fissure dans la soudure",
            photo_url: null,
            status: "ouvert",
            created_at: new Date().toISOString(),
          },
        },
      }).as("postAlerte")

      cy.loginAsOuvrier()
      cy.visit(`/terrain/${TEST_PROJECT_ID}`)
      cy.get("[data-testid='tab-probleme']").click()
    })

    it("le bouton signaler est désactivé par défaut", () => {
      cy.get("[data-testid='submit-probleme']").should("be.disabled")
    })

    it("soumet et affiche la confirmation", () => {
      cy.get("[data-testid='urgency-elevee']").click()
      cy.get("[data-testid='probleme-description']").type("Fissure dans la soudure")
      cy.get("[data-testid='submit-probleme']").click()
      cy.wait("@postAlerte")
      cy.contains("Signalement envoyé").should("be.visible")
    })

    it("le bouton soumettre a une hauteur ≥ 48px", () => {
      cy.get("[data-testid='submit-probleme']").should(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(48)
      })
    })
  })

  // ─── Bureau /alertes page ─────────────────────────────────────────────────────

  describe("Bureau — page /alertes", () => {
    const ALERTE_FIXTURE = {
      id: "alerte-bureau-1",
      project_id: "test-project-id",
      user_id: "test-user-id",
      urgency: "critique",
      description: "Fuite de gaz détectée sur le chantier",
      photo_url: null,
      status: "ouvert",
      handled_by: null,
      handled_at: null,
      resolved_at: null,
      created_at: new Date().toISOString(),
      projects: { id: "test-project-id", title: "Portail Dumont" },
    }

    beforeEach(() => {
      cy.intercept("GET", "/api/terrain/alertes", {
        statusCode: 200,
        body: { alertes: [ALERTE_FIXTURE] },
      }).as("getAlertes")

      cy.loginAsBureau()
    })

    it("affiche une alerte ouverte sur la page /alertes", () => {
      cy.visit("/alertes")
      cy.get("[data-testid='alerte-card']").should("have.length.gte", 1)
      cy.contains("Fuite de gaz").should("be.visible")
    })

    it("le badge d'urgence Critique est visible", () => {
      cy.visit("/alertes")
      cy.contains("Critique").should("be.visible")
    })

    it("peut prendre en charge une alerte (mock PATCH)", () => {
      cy.intercept("PATCH", "/api/terrain/alertes/*", {
        statusCode: 200,
        body: {
          alerte: { ...ALERTE_FIXTURE, status: "pris_en_charge", handled_at: new Date().toISOString() },
        },
      }).as("patchAlerte")

      cy.visit("/alertes")
      cy.get(`[data-testid='action-alerte-${ALERTE_FIXTURE.id}']`).click()
      cy.wait("@patchAlerte")
      cy.get(`[data-testid='alerte-status-${ALERTE_FIXTURE.id}']`).should(
        "contain.text",
        "Pris en charge"
      )
    })

    it("le filtre 'Ouvertes' filtre les alertes", () => {
      cy.visit("/alertes")
      cy.get("[data-testid='filter-ouvert']").click()
      cy.get("[data-testid='alerte-card']").should("have.length.gte", 1)
    })

    it("le filtre 'Résolues' affiche 0 alerte (fixture ouverte)", () => {
      cy.visit("/alertes")
      cy.get("[data-testid='filter-resolu']").click()
      cy.get("[data-testid='alerte-card']").should("have.length", 0)
    })
  })
})
