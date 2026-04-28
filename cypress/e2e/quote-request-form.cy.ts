describe("Quote request form — /devis/nouveau", () => {
  describe("Auth guard", () => {
    it("redirects unauthenticated users to /login", () => {
      cy.visit("/devis/nouveau", { failOnStatusCode: false });
      cy.url().should("include", "/login");
    });

    it("shows the login form after redirect from /devis/nouveau", () => {
      cy.visit("/devis/nouveau", { failOnStatusCode: false });
      cy.get('input[type="email"]').should("be.visible");
      cy.get('input[type="password"]').should("be.visible");
    });
  });
});
