// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to login
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login');
});

// Custom command to add product to cart
Cypress.Commands.add('addToCart', (productName: string) => {
  cy.visit('/');
  cy.contains(productName).click();
  cy.get('[data-testid="add-to-cart-button"]').click();
  cy.get('[data-testid="cart-notification"]').should('be.visible');
});

// Custom command to clear cart
Cypress.Commands.add('clearCart', () => {
  cy.visit('/cart');
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="cart-item"]').length > 0) {
      cy.get('[data-testid="remove-item-button"]').each(($el) => {
        cy.wrap($el).click();
      });
    }
  });
});