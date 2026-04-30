// Custom Cypress commands
export {}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Set a cookie that bypasses server-side Supabase auth in non-production.
       * Must be called before cy.visit() for any protected terrain route.
       */
      loginAsOuvrier(): Chainable<void>
      /**
       * Set a cookie that bypasses server-side Supabase auth as a bureau user.
       * Must be called before cy.visit() for any protected bureau route.
       */
      loginAsBureau(): Chainable<void>
    }
  }
}

Cypress.Commands.add("loginAsOuvrier", () => {
  // Plain ASCII string only — JSON values contain " which RFC 6265 forbids
  // in raw cookie values, causing browsers to silently corrupt the payload.
  cy.setCookie("cypress-test-user", "ouvrier", { path: "/", sameSite: "lax" })
})

Cypress.Commands.add("loginAsBureau", () => {
  cy.setCookie("cypress-test-user", "bureau", { path: "/", sameSite: "lax" })
})
