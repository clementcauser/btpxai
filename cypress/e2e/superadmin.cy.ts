const DESKTOP = { width: 1280, height: 800 } as const

describe("Superadmin — accès aux pages superadmin", () => {
  beforeEach(() => { cy.viewport(DESKTOP.width, DESKTOP.height) })

  it("peut visiter /superadmin/workspaces", () => {
    cy.loginAsSuperAdmin()
    cy.visit("/superadmin/workspaces")
    cy.get("h1").should("contain.text", "Espaces de travail")
  })

  it("peut visiter /superadmin/users", () => {
    cy.loginAsSuperAdmin()
    cy.visit("/superadmin/users")
    cy.get("h1").should("contain.text", "Utilisateurs")
  })
})

describe("Superadmin — blocage sur les pages bureau/terrain", () => {
  beforeEach(() => { cy.viewport(DESKTOP.width, DESKTOP.height) })

  it("est redirigé vers /superadmin/workspaces depuis /dashboard", () => {
    cy.loginAsSuperAdmin()
    cy.visit("/dashboard")
    cy.url().should("include", "/superadmin/workspaces")
  })

  it("est redirigé vers /superadmin/workspaces depuis /terrain", () => {
    cy.loginAsSuperAdmin()
    cy.visit("/terrain")
    cy.url().should("include", "/superadmin/workspaces")
  })
})

describe("Non-superadmin — blocage sur les pages superadmin", () => {
  beforeEach(() => { cy.viewport(DESKTOP.width, DESKTOP.height) })

  it("un bureau est redirigé depuis /superadmin/workspaces vers /dashboard", () => {
    cy.loginAsBureau()
    cy.visit("/superadmin/workspaces")
    cy.url().should("include", "/dashboard")
  })

  it("un admin est redirigé depuis /superadmin/workspaces vers /dashboard", () => {
    cy.loginAsAdmin()
    cy.visit("/superadmin/workspaces")
    cy.url().should("include", "/dashboard")
  })
})

describe("Superadmin — workspaces CRUD (API mockée)", () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cy.loginAsSuperAdmin()
    cy.intercept("GET", "/api/superadmin/workspaces", {
      statusCode: 200,
      body: {
        workspaces: [
          { id: "ws-1", name: "Forge Dupont", slug: "forge-dupont", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: "ws-2", name: "Acier & Co", slug: "acier-co", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ],
      },
    }).as("getWorkspaces")
    cy.visit("/superadmin/workspaces")
  })

  it("affiche la liste des workspaces", () => {
    cy.contains("Forge Dupont").should("be.visible")
    cy.contains("Acier & Co").should("be.visible")
  })

  it("ouvre la modale de création", () => {
    cy.get("[data-testid='create-workspace-btn']").click()
    cy.get("[data-testid='workspace-form-modal']").should("be.visible")
  })

  it("soumet le formulaire de création", () => {
    cy.intercept("POST", "/api/superadmin/workspaces", {
      statusCode: 201,
      body: { workspace: { id: "ws-3", name: "Nouvelle Forge", slug: "nouvelle-forge", created_at: new Date().toISOString(), updated_at: new Date().toISOString() } },
    }).as("createWorkspace")
    cy.get("[data-testid='create-workspace-btn']").click()
    cy.get("input[name='name']").type("Nouvelle Forge")
    cy.get("input[name='slug']").type("nouvelle-forge")
    cy.get("[data-testid='workspace-form-submit']").click()
    cy.wait("@createWorkspace")
    cy.contains("Espace de travail créé").should("be.visible")
  })

  it("supprime un workspace", () => {
    cy.intercept("DELETE", "/api/superadmin/workspaces/ws-1", {
      statusCode: 200,
      body: { success: true },
    }).as("deleteWorkspace")
    cy.get("[data-testid='delete-workspace-ws-1']").click()
    cy.get("[data-testid='delete-confirm-btn']").click()
    cy.wait("@deleteWorkspace")
    cy.contains("Espace de travail supprimé").should("be.visible")
  })
})

describe("Superadmin — users CRUD (API mockée)", () => {
  beforeEach(() => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    cy.loginAsSuperAdmin()
    cy.intercept("GET", "/api/superadmin/users", {
      statusCode: 200,
      body: {
        users: [
          { id: "user-1", email: "admin@btpxai.fr", role: "admin", name: "Admin Principal", created_at: new Date().toISOString() },
          { id: "user-2", email: "bureau@btpxai.fr", role: "bureau", name: "Bureau User", created_at: new Date().toISOString() },
        ],
      },
    }).as("getUsers")
    cy.visit("/superadmin/users")
  })

  it("affiche la liste des utilisateurs", () => {
    cy.contains("admin@btpxai.fr").should("be.visible")
    cy.contains("bureau@btpxai.fr").should("be.visible")
  })

  it("ouvre la modale de création utilisateur", () => {
    cy.get("[data-testid='create-user-btn']").click()
    cy.get("[data-testid='user-form-modal']").should("be.visible")
  })
})
