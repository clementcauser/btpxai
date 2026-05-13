describe("Calendrier — Bureau", () => {
  beforeEach(() => {
    cy.loginAsBureau()
    cy.visit("/calendrier")
  })

  it("affiche la page calendrier avec la grille mensuelle", () => {
    cy.contains("h1", "Calendrier").should("be.visible")
    cy.contains("button", "Mois").should("be.visible")
    cy.contains("Lun").should("be.visible")
    cy.contains("Dim").should("be.visible")
  })

  it("navigue vers le mois suivant via la flèche", () => {
    cy.get('[aria-label="Période suivante"]').click()
    cy.get('[aria-label="Période précédente"]').should("be.visible")
  })

  it("revient à aujourd'hui avec le bouton Aujourd'hui", () => {
    cy.get('[aria-label="Période suivante"]').click()
    cy.contains("button", "Aujourd'hui").click()
    cy.contains("button", "Aujourd'hui").should("be.visible")
  })

  it("change de vue vers Semaine", () => {
    cy.contains("button", "Semaine").click()
    cy.contains("button", "Semaine").should("be.visible")
  })

  it("change de vue vers Jour", () => {
    cy.contains("button", "Jour").click()
    cy.contains("button", "Jour").should("be.visible")
  })

  it("ouvre la modale de création en cliquant sur Nouvel événement", () => {
    cy.contains("button", "Nouvel événement").click()
    cy.contains("Nouvel événement").should("be.visible")
  })

  it("ferme la modale avec Annuler", () => {
    cy.contains("button", "Nouvel événement").click()
    cy.contains("button", "Annuler").click()
    cy.contains("button", "Nouvel événement").should("be.visible")
  })
})

describe("Calendrier — Ouvrier", () => {
  beforeEach(() => {
    cy.loginAsOuvrier()
    cy.visit("/terrain/calendrier")
  })

  it("affiche le planning avec le titre Mon planning", () => {
    cy.contains("Mon planning").should("be.visible")
  })

  it("n'affiche pas de bouton Nouvel événement", () => {
    cy.contains("button", "Nouvel événement").should("not.exist")
  })

  it("n'affiche pas les filtres par ouvrier", () => {
    cy.contains("Filtrer :").should("not.exist")
  })
})
