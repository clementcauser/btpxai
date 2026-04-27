describe("Login page", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("renders the brand header", () => {
    cy.get("h1").should("contain.text", "BTP");
    cy.get("h1").should("contain.text", "AI");
  });

  it("renders the login form with email and password fields", () => {
    cy.get("h2").should("contain.text", "Connexion");
    cy.get('input[type="email"]').should("be.visible");
    cy.get('input[type="password"]').should("be.visible");
    cy.get('button[type="submit"]').should("contain.text", "connecter");
  });

  it("shows validation errors on empty submit", () => {
    cy.get('button[type="submit"]').click();
    cy.contains("Adresse email invalide").should("be.visible");
  });
});
