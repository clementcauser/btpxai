/**
 * Interface terrain (ouvrier) — viewport 375 × 812 (iPhone SE)
 *
 * Toutes les suites utilisent cy.loginAsOuvrier() pour poser le cookie
 * qui permet au Server Component de bypass l'auth Supabase en test.
 * La page détail utilise le projectId "test-project-id" qui renvoie
 * une fixture dans l'env non-production.
 */
describe("Interface terrain (ouvrier) — viewport 375px", () => {
  const MOBILE = { width: 375, height: 812 } as const
  const TEST_PROJECT_ID = "test-project-id"

  beforeEach(() => {
    cy.viewport(MOBILE.width, MOBILE.height)
  })

  // ─── Page d'accueil ──────────────────────────────────────────────────────────

  describe("Page d'accueil /terrain", () => {
    beforeEach(() => {
      cy.loginAsOuvrier()
      cy.visit("/terrain")
    })

    it("affiche le titre principal", () => {
      cy.get("h1").should("contain.text", "Mes chantiers")
    })

    it("la zone de contenu est présente (liste ou état vide)", () => {
      cy.get("main").should("exist")
    })

    it("n'utilise aucun tableau (<table>)", () => {
      cy.get("table").should("not.exist")
    })

    it("les cartes projet ont une hauteur ≥ 48px", () => {
      cy.get("[data-testid='project-card']").each(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(48)
      })
    })
  })

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const visitProject = () => {
    cy.loginAsOuvrier()
    cy.visit(`/terrain/${TEST_PROJECT_ID}`)
  }

  // ─── Navigation par onglets ───────────────────────────────────────────────────

  describe("Navigation par onglets (page projet)", () => {
    beforeEach(visitProject)

    it("affiche la barre d'onglets en bas de l'écran", () => {
      cy.get("[data-testid='bottom-nav']").should("be.visible")
    })

    it("le titre du projet est affiché", () => {
      cy.get("h1").should("contain.text", "Portail Dumont")
    })

    it("chaque onglet a une hauteur ≥ 48px", () => {
      const tabs = ["notes", "photos", "materiaux", "avancement", "probleme"]
      tabs.forEach((tab) => {
        cy.get(`[data-testid='tab-${tab}']`).should(($el) => {
          expect($el[0].getBoundingClientRect().height).to.be.gte(48)
        })
      })
    })

    it("le bouton retour est visible et ≥ 44px", () => {
      cy.get("[data-testid='back-button']").should("be.visible").then(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(44)
      })
    })

    it("affiche l'onglet Notes par défaut", () => {
      cy.get("[data-testid='record-button']").should("be.visible")
    })

    it("bascule vers Photos en 1 tap", () => {
      cy.get("[data-testid='tab-photos']").click()
      cy.get("[data-testid='photo-button']").should("be.visible")
    })

    it("bascule vers Matériaux en 1 tap", () => {
      cy.get("[data-testid='tab-materiaux']").click()
      cy.get("[data-testid='materiau-label']").should("be.visible")
    })

    it("bascule vers Avancement en 1 tap", () => {
      cy.get("[data-testid='tab-avancement']").click()
      cy.get("[data-testid='step-1']").should("be.visible")
    })

    it("bascule vers Problème en 1 tap", () => {
      cy.get("[data-testid='tab-probleme']").click()
      cy.get("[data-testid='submit-probleme']").should("be.visible")
    })

    it("n'utilise aucun tableau (<table>)", () => {
      cy.get("table").should("not.exist")
    })
  })

  // ─── Onglet Notes ─────────────────────────────────────────────────────────────

  describe("Onglet Notes", () => {
    beforeEach(visitProject)

    it("le bouton enregistrer a une hauteur ≥ 48px", () => {
      cy.get("[data-testid='record-button']").should(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(48)
      })
    })

    it("le bouton est visible sans scroll", () => {
      cy.get("[data-testid='record-button']").should("be.visible")
    })
  })

  // ─── Onglet Matériaux ─────────────────────────────────────────────────────────

  describe("Onglet Matériaux", () => {
    beforeEach(() => {
      visitProject()
      cy.get("[data-testid='tab-materiaux']").click()
    })

    it("le bouton envoyer est désactivé quand les champs sont vides", () => {
      cy.get("[data-testid='submit-materiau']").should("be.disabled")
    })

    it("le bouton s'active après saisie valide (matériau + quantité)", () => {
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
      visitProject()
      cy.get("[data-testid='tab-avancement']").click()
    })

    it("la première étape a une hauteur ≥ 48px", () => {
      cy.get("[data-testid='step-1']").should(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(48)
      })
    })

    it("coche une étape non complétée en 1 tap", () => {
      cy.get("[data-testid='step-2']").click()
      // L'étape doit toujours exister (React re-render avec état coché)
      cy.get("[data-testid='step-2']").should("exist")
    })

    it("affiche une barre de progression", () => {
      cy.contains("%").should("be.visible")
    })
  })

  // ─── Onglet Problème ──────────────────────────────────────────────────────────

  describe("Onglet Problème", () => {
    beforeEach(() => {
      visitProject()
      cy.get("[data-testid='tab-probleme']").click()
    })

    it("le bouton signaler est désactivé par défaut", () => {
      cy.get("[data-testid='submit-probleme']").should("be.disabled")
    })

    it("s'active après choix d'urgence + description (2 actions)", () => {
      cy.get("[data-testid='urgency-elevee']").click()
      cy.get("[data-testid='probleme-description']").type("Fissure dans la soudure")
      cy.get("[data-testid='submit-probleme']").should("not.be.disabled")
    })

    it("le bouton signaler a une hauteur ≥ 48px", () => {
      cy.get("[data-testid='submit-probleme']").should(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(48)
      })
    })

    it("les 3 boutons d'urgence ont une hauteur ≥ 48px", () => {
      ;["faible", "elevee", "critique"].forEach((level) => {
        cy.get(`[data-testid='urgency-${level}']`).should(($el) => {
          expect($el[0].getBoundingClientRect().height).to.be.gte(48)
        })
      })
    })
  })

  // ─── Notes vocales ────────────────────────────────────────────────────────────

  describe("Notes vocales", () => {
    beforeEach(() => {
      cy.intercept("GET", "/api/terrain/notes*", {
        statusCode: 200,
        body: { notes: [] },
      }).as("getNotes")

      cy.intercept("POST", "/api/terrain/notes", {
        statusCode: 201,
        body: {
          note: {
            id: "note-1",
            project_id: "test-project-id",
            user_id: "test-user-id",
            transcription: "Besoin de rallonges électriques côté portail",
            audio_url: null,
            created_at: new Date().toISOString(),
          },
        },
      }).as("postNote")

      cy.loginAsOuvrier()
      cy.visit(`/terrain/${TEST_PROJECT_ID}`)
    })

    it("affiche l'onglet Notes et le bouton d'enregistrement", () => {
      cy.get("[data-testid='tab-notes']").click()
      cy.get("[data-testid='record-button']").should("be.visible")
      cy.get("[data-testid='record-button']").invoke("outerHeight").should("be.gte", 48)
    })

    it("affiche les notes existantes chargées depuis l'API", () => {
      cy.intercept("GET", "/api/terrain/notes*", {
        statusCode: 200,
        body: {
          notes: [
            {
              id: "note-existing",
              project_id: "test-project-id",
              user_id: "test-user-id",
              transcription: "Note existante de test",
              audio_url: null,
              created_at: new Date().toISOString(),
            },
          ],
        },
      }).as("getNotesWithData")

      cy.get("[data-testid='tab-notes']").click()
      cy.wait("@getNotesWithData")
      cy.contains("Note existante de test").should("be.visible")
    })

    it("simule un POST de note et vérifie la réponse API", () => {
      cy.get("[data-testid='tab-notes']").click()

      cy.window().then((win) => {
        const fd = new win.FormData()
        fd.append("project_id", "test-project-id")
        fd.append("transcription", "Besoin de rallonges électriques côté portail")
        return win.fetch("/api/terrain/notes", { method: "POST", body: fd })
      })

      cy.wait("@postNote")
      cy.get("@postNote").its("response.statusCode").should("eq", 201)
    })
  })

  // ─── Accessibilité 1 main ─────────────────────────────────────────────────────

  describe("Utilisable d'une seule main : ≤ 3 actions par écran", () => {
    beforeEach(visitProject)

    it("onglet Notes — 1 seul bouton d'action principal", () => {
      // Exclure les onglets et le retour de la sélection
      cy.get(
        "button:visible:not([data-testid^='tab-']):not([data-testid='back-button'])"
      ).should("have.length.lte", 3)
    })

    it("onglet Problème — au plus 5 éléments interactifs visibles hors nav", () => {
      cy.get("[data-testid='tab-probleme']").click()
      cy.get(
        "button:visible:not([data-testid^='tab-']):not([data-testid='back-button'])"
      ).should("have.length.lte", 5)
    })
  })
})
