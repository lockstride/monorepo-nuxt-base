describe("Webapp", () => {
  describe("when visiting the home page", () => {
    beforeEach(() => {
      cy.visit("/");
    });

    it("should display the app layout header", () => {
      cy.contains("h1", "Hello from webapp").should("be.visible");
    });

    it("should display the page title", () => {
      cy.contains("h1", "Web App (SPA)").should("be.visible");
    });

    it("should display the fetch description", () => {
      cy.contains("Fetching message from the backend API...").should(
        "be.visible"
      );
    });

    it("should fetch and display data from the API", () => {
      // The data container should be visible
      cy.get(".border.rounded-md").should("be.visible");

      // Wait for data to load (should show message from API)
      cy.get(".border.rounded-md pre", { timeout: 10000 }).should("exist");
    });
  });
});
