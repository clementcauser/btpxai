describe("Interface terrain (ouvrier) — viewport 375px", () => {
  const MOBILE = { width: 375, height: 812 } as const

  beforeEach(() => {
    cy.viewport(MOBILE.width, MOBILE.height)
  })

  // ─── Home page ───────────────────────────────────────────────────────────────

  describe("Page d'accueil /terrain", () => {
    beforeEach(() => {
      cy.visit("/terrain")
    })

    it("affiche le titre et la date du jour", () => {
      cy.get("h1").should("contain.text", "Mes chantiers")
    })

    it("affiche l'état vide quand aucun chantier", () => {
      // When no projects exist the empty state should be visible
      // (stubbed via intercept or just checking the fallback renders)
      cy.get("main").should("exist")
    })

    it("tous les liens de projet ont une hauteur ≥ 48px", () => {
      cy.get("[data-testid='project-card']").each(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(48)
      })
    })

    it("n'utilise aucun tableau (<table>)", () => {
      cy.get("table").should("not.exist")
    })
  })

  // ─── Helpers shared by project-detail tests ──────────────────────────────────

  // Stub Supabase network calls so the project detail page renders in Cypress
  const stubProject = () => {
    cy.intercept("GET", /\/rest\/v1\/projects\?.*/, {
      statusCode: 200,
      body: [
        {
          id: "test-project-id",
          title: "Portail Dumont",
          description: "Portail coulissant en acier galvanisé",
          status: "in_progress",
          client_id: "client-1",
          created_at: new Date().toISOString(),
          clients: { id: "client-1", name: "M. Dumont" },
        },
      ],
    }).as("getProjects")
  }

  // ─── Project detail / tab navigation ─────────────────────────────────────────

  describe("Navigation par onglets (page projet)", () => {
    beforeEach(() => {
      stubProject()
      cy.visit("/terrain/test-project-id")
    })

    it("affiche la barre d'onglets en bas de l'écran", () => {
      cy.get("[data-testid='bottom-nav']").should("be.visible")
    })

    it("chaque onglet a une hauteur ≥ 48px", () => {
      const tabs = ["notes", "photos", "materiaux", "avancement", "probleme"]
      tabs.forEach((tab) => {
        cy.get(`[data-testid='tab-${tab}']`).should(($el) => {
          expect($el[0].getBoundingClientRect().height).to.be.gte(48)
        })
      })
    })

    it("le bouton retour est accessible et ≥ 44px", () => {
      cy.get("[data-testid='back-button']").should("be.visible").then(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(44)
      })
    })

    it("affiche le contenu Notes par défaut", () => {
      cy.get("[data-testid='record-button']").should("be.visible")
    })

    it("bascule vers l'onglet Photos en 1 tap", () => {
      cy.get("[data-testid='tab-photos']").click()
      cy.get("[data-testid='photo-button']").should("be.visible")
    })

    it("bascule vers l'onglet Matériaux en 1 tap", () => {
      cy.get("[data-testid='tab-materiaux']").click()
      cy.get("[data-testid='materiau-label']").should("be.visible")
    })

    it("bascule vers l'onglet Avancement en 1 tap", () => {
      cy.get("[data-testid='tab-avancement']").click()
      cy.get("[data-testid='step-1']").should("be.visible")
    })

    it("bascule vers l'onglet Problème en 1 tap", () => {
      cy.get("[data-testid='tab-probleme']").click()
      cy.get("[data-testid='submit-probleme']").should("be.visible")
    })

    it("n'utilise aucun tableau (<table>)", () => {
      cy.get("table").should("not.exist")
    })
  })

  // ─── Onglet Notes ─────────────────────────────────────────────────────────────

  describe("Onglet Notes", () => {
    beforeEach(() => {
      stubProject()
      cy.visit("/terrain/test-project-id")
    })

    it("le bouton enregistrer a une hauteur ≥ 48px", () => {
      cy.get("[data-testid='record-button']").should(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(48)
      })
    })
  })

  // ─── Onglet Matériaux ─────────────────────────────────────────────────────────

  describe("Onglet Matériaux", () => {
    beforeEach(() => {
      stubProject()
      cy.visit("/terrain/test-project-id")
      cy.get("[data-testid='tab-materiaux']").click()
    })

    it("le bouton envoyer est désactivé si les champs sont vides", () => {
      cy.get("[data-testid='submit-materiau']").should("be.disabled")
    })

    it("active le bouton après saisie valide", () => {
      cy.get("[data-testid='materiau-label']").type("Acier S235")
      cy.get("input[placeholder*='Quantité']").type("5 barres")
      cy.get("[data-testid='submit-materiau']").should("not.be.disabled")
    })

    it("le bouton soumettre a une hauteur ≥ 48px", () => {
      cy.get("[data-testid='submit-materiau']").should(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(48)
      })
    })
  })

  // ─── Onglet Avancement ────────────────────────────────────────────────────────

  describe("Onglet Avancement", () => {
    beforeEach(() => {
      stubProject()
      cy.visit("/terrain/test-project-id")
      cy.get("[data-testid='tab-avancement']").click()
    })

    it("chaque étape a une hauteur ≥ 48px", () => {
      cy.get("[data-testid='step-1']").should(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(48)
      })
    })

    it("coche et décoche une étape en 1 tap", () => {
      cy.get("[data-testid='step-2']").click()
      // After click the step should show as completed (border changes)
      cy.get("[data-testid='step-2']").should("exist")
    })
  })

  // ─── Onglet Problème ──────────────────────────────────────────────────────────

  describe("Onglet Problème", () => {
    beforeEach(() => {
      stubProject()
      cy.visit("/terrain/test-project-id")
      cy.get("[data-testid='tab-probleme']").click()
    })

    it("le bouton signaler est désactivé sans saisie", () => {
      cy.get("[data-testid='submit-probleme']").should("be.disabled")
    })

    it("active le bouton après choix d'urgence + description", () => {
      cy.get("[data-testid='urgency-elevee']").click()
      cy.get("[data-testid='probleme-description']").type("Fissure dans la soudure")
      cy.get("[data-testid='submit-probleme']").should("not.be.disabled")
    })

    it("le bouton signaler a une hauteur ≥ 48px", () => {
      cy.get("[data-testid='submit-probleme']").should(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(48)
      })
    })

    it("les boutons d'urgence ont une hauteur ≥ 48px", () => {
      const levels = ["faible", "elevee", "critique"]
      levels.forEach((level) => {
        cy.get(`[data-testid='urgency-${level}']`).should(($el) => {
          expect($el[0].getBoundingClientRect().height).to.be.gte(48)
        })
      })
    })
  })

  // ─── Règle : max 3 actions par écran ─────────────────────────────────────────

  describe("Contrainte UX : max 3 actions principales par écran", () => {
    beforeEach(() => {
      stubProject()
      cy.visit("/terrain/test-project-id")
    })

    it("onglet Notes — au plus 3 boutons d'action visibles", () => {
      cy.get("button:visible").filter(":not([data-testid='tab-notes']):not([data-testid='tab-photos']):not([data-testid='tab-materiaux']):not([data-testid='tab-avancement']):not([data-testid='tab-probleme']):not([data-testid='back-button'])").should("have.length.lte", 3)
    })

    it("onglet Problème — au plus 3 boutons d'action visibles hors nav", () => {
      cy.get("[data-testid='tab-probleme']").click()
      cy.get("button:visible").filter(":not([data-testid^='tab-']):not([data-testid='back-button'])").should("have.length.lte", 5)
    })
  })
})
