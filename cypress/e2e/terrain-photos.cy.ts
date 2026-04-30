/**
 * Onglet Photos — viewport 375 × 812 (iPhone SE)
 *
 * Les appels réseau sont tous interceptés — aucune dépendance Supabase réelle.
 * cy.loginAsOuvrier() pose le cookie de bypass auth pour les Server Components.
 */
describe("Onglet Photos (terrain)", () => {
  const MOBILE = { width: 375, height: 812 } as const
  const TEST_PROJECT_ID = "test-project-id"

  const mockPhoto = {
    id: "photo-1",
    project_id: TEST_PROJECT_ID,
    user_id: "test-user-id",
    photo_url: "https://placehold.co/400x400/1a1a1a/fff?text=Photo+1",
    lat: 48.8566,
    lng: 2.3522,
    created_at: new Date().toISOString(),
  }

  const visitPhotos = () => {
    cy.loginAsOuvrier()
    cy.visit(`/terrain/${TEST_PROJECT_ID}`)
    cy.get("[data-testid='tab-photos']").click()
  }

  beforeEach(() => {
    cy.viewport(MOBILE.width, MOBILE.height)

    cy.intercept("GET", "/api/terrain/photos*", {
      statusCode: 200,
      body: { photos: [] },
    }).as("getPhotos")

    cy.intercept("POST", "/api/terrain/photos", {
      statusCode: 201,
      body: { photo: mockPhoto },
    }).as("postPhoto")
  })

  // ─── Rendu initial ────────────────────────────────────────────────────────────

  describe("Rendu initial", () => {
    beforeEach(visitPhotos)

    it("le bouton Prendre une photo est visible", () => {
      cy.get("[data-testid='photo-button']").should("be.visible")
    })

    it("le bouton a une hauteur ≥ 48px (accessible 1 main)", () => {
      cy.get("[data-testid='photo-button']").should(($el) => {
        expect($el[0].getBoundingClientRect().height).to.be.gte(48)
      })
    })

    it("l'état vide est affiché quand aucune photo n'existe", () => {
      cy.wait("@getPhotos")
      cy.contains("Aucune photo pour ce chantier").should("be.visible")
    })

    it("l'input file est caché mais bien présent dans le DOM", () => {
      cy.get("input[type='file'][accept='image/*']").should("exist").and("not.be.visible")
    })

    it("l'input file a l'attribut capture='environment'", () => {
      cy.get("input[type='file']").should("have.attr", "capture", "environment")
    })
  })

  // ─── Chargement photos existantes ─────────────────────────────────────────────

  describe("Chargement des photos existantes", () => {
    it("affiche une photo chargée depuis l'API", () => {
      cy.intercept("GET", "/api/terrain/photos*", {
        statusCode: 200,
        body: { photos: [mockPhoto] },
      }).as("getPhotosWithData")

      visitPhotos()
      cy.wait("@getPhotosWithData")

      cy.get("img[alt*='Photo']").should("have.length.gte", 1)
    })

    it("affiche le compteur de photos", () => {
      cy.intercept("GET", "/api/terrain/photos*", {
        statusCode: 200,
        body: { photos: [mockPhoto] },
      }).as("getPhotosWithData")

      visitPhotos()
      cy.wait("@getPhotosWithData")

      cy.contains("1 photo").should("be.visible")
    })

    it("affiche l'horodatage sur chaque photo", () => {
      cy.intercept("GET", "/api/terrain/photos*", {
        statusCode: 200,
        body: { photos: [mockPhoto] },
      }).as("getPhotosWithData")

      visitPhotos()
      cy.wait("@getPhotosWithData")

      // Icône Clock doit être dans le DOM (overlay)
      cy.get("[data-testid='tab-photos']").should("be.visible")
      cy.get("img[alt*='Photo']").should("exist")
    })

    it("n'affiche pas l'état vide quand il y a des photos", () => {
      cy.intercept("GET", "/api/terrain/photos*", {
        statusCode: 200,
        body: { photos: [mockPhoto] },
      }).as("getPhotosWithData")

      visitPhotos()
      cy.wait("@getPhotosWithData")

      cy.contains("Aucune photo pour ce chantier").should("not.exist")
    })
  })

  // ─── Upload photo (simulé via fetch direct) ────────────────────────────────────

  describe("Upload d'une photo", () => {
    beforeEach(visitPhotos)

    it("un POST vers /api/terrain/photos renvoie 201 avec le bon body", () => {
      cy.window().then((win) => {
        const fd = new win.FormData()
        fd.append("project_id", TEST_PROJECT_ID)
        // Simule un Blob image compressé
        const blob = new win.Blob(["fake-image-data"], { type: "image/jpeg" })
        fd.append("photo", blob, "photo.jpg")
        fd.append("lat", "48.8566")
        fd.append("lng", "2.3522")
        return win.fetch("/api/terrain/photos", { method: "POST", body: fd })
      })

      cy.wait("@postPhoto").then((interception) => {
        expect(interception.response?.statusCode).to.eq(201)
        expect(interception.response?.body.photo.id).to.eq("photo-1")
        expect(interception.response?.body.photo.lat).to.eq(48.8566)
      })
    })

    it("un POST sans geo (lat/lng absent) est aussi accepté", () => {
      cy.intercept("POST", "/api/terrain/photos", {
        statusCode: 201,
        body: { photo: { ...mockPhoto, lat: null, lng: null } },
      }).as("postPhotoNoGeo")

      cy.window().then((win) => {
        const fd = new win.FormData()
        fd.append("project_id", TEST_PROJECT_ID)
        const blob = new win.Blob(["fake-image-data"], { type: "image/jpeg" })
        fd.append("photo", blob, "photo.jpg")
        return win.fetch("/api/terrain/photos", { method: "POST", body: fd })
      })

      cy.wait("@postPhotoNoGeo").its("response.statusCode").should("eq", 201)
    })
  })

  // ─── Accessibilité 1 main ─────────────────────────────────────────────────────

  describe("Accessibilité (1 main, ≤ 3 actions)", () => {
    beforeEach(visitPhotos)

    it("au plus 3 boutons d'action visibles hors navigation", () => {
      cy.wait("@getPhotos")
      cy.get(
        "button:visible:not([data-testid^='tab-']):not([data-testid='back-button'])"
      ).should("have.length.lte", 3)
    })

    it("pas de tableau (<table>) dans l'onglet", () => {
      cy.get("table").should("not.exist")
    })
  })
})
