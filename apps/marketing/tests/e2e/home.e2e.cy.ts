describe("Marketing App", () => {
  describe("when visiting the home page", () => {
    beforeEach(() => {
      cy.visit("/");
    });

    it("should display the app layout header", () => {
      cy.contains("h1", "Hello from marketing").should("be.visible");
    });

    it("should display the page title", () => {
      cy.contains("h1", "Marketing Site (SSR/SSG)").should("be.visible");
    });

    it("should display the static content", () => {
      cy.contains('This is a static "Hello World" page.').should("be.visible");
    });
  });
});
