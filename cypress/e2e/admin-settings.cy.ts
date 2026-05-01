/**
 * Admin settings page — E2E tests
 *
 * Covers:
 * 1. Admin can access /parametres
 * 2. Non-admin (bureau) is redirected away from /parametres
 * 3. Tab navigation works
 * 4. Company name can be updated (mocked API) and feedback is shown
 * 5. Reminders toggle changes state
 * 6. CGV text can be saved
 * 7. User invite form validates and submits
 */

const DESKTOP = { width: 1280, height: 800 } as const

describe("Page /parametres — accès et navigation", () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
  })

  it("redirige un utilisateur bureau vers /dashboard", () => {
    cy.loginAsBureau()
    cy.visit("/parametres")
    cy.url().should("include", "/dashboard")
  })

  it("permet à un admin d'accéder à /parametres", () => {
    cy.loginAsAdmin()
    cy.visit("/parametres")
    cy.get("h1").should("contain.text", "Paramètres")
  })

  it("affiche le sous-titre administration", () => {
    cy.loginAsAdmin()
    cy.visit("/parametres")
    cy.contains("Administration").should("be.visible")
  })
})

describe("Page /parametres — navigation par onglets", () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cy.loginAsAdmin()
    cy.visit("/parametres")
  })

  it("affiche l'onglet Entreprise par défaut", () => {
    cy.get("[data-testid='tab-entreprise']").should("be.visible")
    cy.get("[data-testid='company-section']").should("be.visible")
  })

  it("navigue vers l'onglet Automatisations", () => {
    cy.get("[data-testid='tab-automatisations']").click()
    cy.get("[data-testid='reminders-toggle']").should("be.visible")
  })

  it("navigue vers l'onglet Intégrations", () => {
    cy.get("[data-testid='tab-integrations']").click()
    cy.contains("Boîte mail").should("be.visible")
  })

  it("navigue vers l'onglet Équipe", () => {
    cy.get("[data-testid='tab-equipe']").click()
    cy.get("[data-testid='invite-email-input']").should("be.visible")
  })
})

describe("Page /parametres — informations entreprise", () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cy.loginAsAdmin()
    cy.visit("/parametres")

    // Mock the API to avoid real DB writes
    cy.intercept("POST", "/api/parametres/company", { statusCode: 200, body: { ok: true } }).as(
      "saveCompany"
    )
  })

  it("affiche les champs du formulaire", () => {
    cy.get("[data-testid='company-name-input']").should("be.visible")
    cy.get("[data-testid='company-address-input']").should("be.visible")
    cy.get("[data-testid='company-siret-input']").should("be.visible")
  })

  it("sauvegarde les informations et affiche la confirmation", () => {
    cy.get("[data-testid='company-name-input']").clear().type("Forge Dupont Métallerie")
    cy.get("[data-testid='company-siret-input']").clear().type("12345678900012")
    cy.get("[data-testid='company-save-btn']").click()

    cy.wait("@saveCompany")
    cy.contains("Sauvegardé").should("be.visible")
  })

  it("persiste la valeur saisie dans le champ après sauvegarde", () => {
    cy.get("[data-testid='company-name-input']").clear().type("Acier & Co")
    cy.get("[data-testid='company-save-btn']").click()
    cy.wait("@saveCompany")
    cy.get("[data-testid='company-name-input']").should("have.value", "Acier & Co")
  })
})

describe("Page /parametres — CGV", () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cy.loginAsAdmin()
    cy.visit("/parametres")

    cy.intercept("PATCH", "/api/parametres/settings", { statusCode: 200, body: { ok: true } }).as(
      "saveSetting"
    )
  })

  it("sauvegarde le texte des CGV", () => {
    cy.get("[data-testid='cgv-textarea']").clear().type("Article 1 — Conditions générales")
    cy.get("[data-testid='cgv-save-btn']").click()
    cy.wait("@saveSetting")
    cy.contains("Sauvegardé").should("be.visible")
  })
})

describe("Page /parametres — relances automatiques", () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cy.loginAsAdmin()
    cy.visit("/parametres")
    cy.get("[data-testid='tab-automatisations']").click()

    cy.intercept("PATCH", "/api/parametres/settings", { statusCode: 200, body: { ok: true } }).as(
      "saveSetting"
    )
  })

  it("peut basculer le toggle relances", () => {
    cy.get("[data-testid='reminders-toggle']").then(($btn) => {
      const initial = $btn.attr("aria-checked")
      cy.wrap($btn).click()
      cy.wait("@saveSetting")
      cy.get("[data-testid='reminders-toggle']").should(
        "have.attr",
        "aria-checked",
        initial === "true" ? "false" : "true"
      )
    })
  })

  it("affiche les champs de délai", () => {
    cy.get("[data-testid='reminders-delay-j7']").should("be.visible")
    cy.get("[data-testid='reminders-delay-j14']").should("be.visible")
  })
})

describe("Page /parametres — gestion des utilisateurs", () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cy.loginAsAdmin()
    cy.visit("/parametres")
    cy.get("[data-testid='tab-equipe']").click()
  })

  it("affiche le formulaire d'invitation", () => {
    cy.get("[data-testid='invite-email-input']").should("be.visible")
    cy.get("[data-testid='invite-submit-btn']").should("be.visible")
  })

  it("les sélecteurs de rôle sont visibles", () => {
    cy.get("[data-testid='invite-role-bureau']").should("be.visible")
    cy.get("[data-testid='invite-role-ouvrier']").should("be.visible")
    cy.get("[data-testid='invite-role-admin']").should("be.visible")
  })

  it("refuse une invitation avec email invalide", () => {
    cy.get("[data-testid='invite-email-input']").type("pas-un-email")
    cy.get("[data-testid='invite-submit-btn']").click()
    cy.contains("Email invalide").should("be.visible")
  })

  it("invite un utilisateur avec succès (API mockée)", () => {
    cy.intercept("POST", "/api/parametres/users/invite", {
      statusCode: 200,
      body: {
        user: {
          id: "new-user-id",
          email: "nouveau@exemple.com",
          role: "bureau",
          created_at: new Date().toISOString(),
        },
      },
    }).as("inviteUser")

    cy.get("[data-testid='invite-email-input']").type("nouveau@exemple.com")
    cy.get("[data-testid='invite-role-bureau']").click()
    cy.get("[data-testid='invite-submit-btn']").click()

    cy.wait("@inviteUser")
    cy.contains("Invitation envoyée").should("be.visible")
    cy.contains("nouveau@exemple.com").should("be.visible")
  })
})
