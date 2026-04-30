// Custom Cypress commands

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Set a cookie that bypasses server-side Supabase auth in non-production.
       * Must be called before cy.visit() for any protected terrain route.
       */
      loginAsOuvrier(): Chainable<void>
    }
  }
}

Cypress.Commands.add("loginAsOuvrier", () => {
  cy.setCookie(
    "cypress-test-user",
    JSON.stringify({
      id: "test-user-id",
      email: "ouvrier@test.com",
      user_metadata: { role: "ouvrier" },
    }),
    // Ensure the cookie is sent to the Next.js server on navigation
    { path: "/", sameSite: "lax" }
  )
})
