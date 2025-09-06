describe('Checkout Workflow', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  };

  const shippingAddress = {
    street: '123 Test Street',
    city: 'Test City',
    state: 'California',
    zipCode: '12345',
    country: 'United States'
  };

  beforeEach(() => {
    // Mock API responses for testing
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          user: {
            _id: 'user123',
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            role: 'customer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          token: 'mock-jwt-token'
        }
      }
    }).as('login');

    cy.intercept('GET', '/api/products*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          data: [
            {
              _id: 'product1',
              name: 'Test Product 1',
              description: 'A great test product',
              price: 29.99,
              category: 'Electronics',
              images: ['https://via.placeholder.com/300'],
              inventory: 10,
              tags: ['test'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              _id: 'product2',
              name: 'Test Product 2',
              description: 'Another great test product',
              price: 49.99,
              category: 'Electronics',
              images: ['https://via.placeholder.com/300'],
              inventory: 5,
              tags: ['test'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    }).as('getProducts');

    cy.intercept('GET', '/api/cart/user123', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          items: [
            {
              productId: 'product1',
              product: {
                _id: 'product1',
                name: 'Test Product 1',
                price: 29.99,
                images: ['https://via.placeholder.com/300']
              },
              quantity: 2,
              price: 29.99
            }
          ],
          totalAmount: 59.98
        }
      }
    }).as('getCart');

    cy.intercept('POST', '/api/orders', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          _id: 'order123',
          userId: 'user123',
          items: [
            {
              productId: 'product1',
              name: 'Test Product 1',
              quantity: 2,
              price: 29.99
            }
          ],
          totalAmount: 59.98,
          status: 'pending',
          shippingAddress: shippingAddress,
          paymentMethod: 'credit_card',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    }).as('createOrder');

    cy.intercept('DELETE', '/api/cart/user123', {
      statusCode: 200,
      body: { success: true }
    }).as('clearCart');
  });

  it('should complete the full checkout workflow', () => {
    // Step 1: Login
    cy.visit('/login');
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();
    cy.wait('@login');

    // Step 2: Navigate to cart (assuming items are already in cart)
    cy.visit('/cart');
    cy.wait('@getCart');

    // Verify cart contents
    cy.contains('Test Product 1').should('be.visible');
    cy.contains('$59.98').should('be.visible');

    // Step 3: Proceed to checkout
    cy.get('button').contains('Proceed to Checkout').click();
    cy.url().should('include', '/checkout');

    // Step 4: Fill shipping information
    cy.get('input[name="street"]').clear().type(shippingAddress.street);
    cy.get('input[name="city"]').clear().type(shippingAddress.city);
    cy.get('input[name="state"]').click();
    cy.get('li').contains(shippingAddress.state).click();
    cy.get('input[name="zipCode"]').clear().type(shippingAddress.zipCode);
    cy.get('input[name="country"]').clear().type(shippingAddress.country);

    // Continue to payment
    cy.get('button').contains('Continue to Payment').click();

    // Step 5: Select payment method
    cy.get('input[value="credit_card"]').should('be.checked'); // Default selection
    cy.get('button').contains('Review Order').click();

    // Step 6: Review and place order
    cy.contains('Shipping Information').should('be.visible');
    cy.contains(shippingAddress.street).should('be.visible');
    cy.contains('Payment Method').should('be.visible');
    cy.contains('CREDIT CARD').should('be.visible');

    // Verify order summary
    cy.contains('Test Product 1').should('be.visible');
    cy.contains('$59.98').should('be.visible');

    // Place the order
    cy.get('button').contains('Place Order').click();
    cy.wait('@createOrder');
    cy.wait('@clearCart');

    // Step 7: Verify order confirmation
    cy.url().should('include', '/order-confirmation');
    cy.contains('Order Confirmed!').should('be.visible');
    cy.contains('#ORDER123').should('be.visible');
    cy.contains('Test Product 1').should('be.visible');
    cy.contains(shippingAddress.street).should('be.visible');
  });

  it('should validate shipping form fields', () => {
    // Login first
    cy.visit('/login');
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();
    cy.wait('@login');

    // Go to checkout
    cy.visit('/checkout');

    // Try to submit empty form
    cy.get('button').contains('Continue to Payment').click();

    // Check for validation errors
    cy.contains('Street address is required').should('be.visible');
    cy.contains('City is required').should('be.visible');
    cy.contains('State is required').should('be.visible');
    cy.contains('ZIP code is required').should('be.visible');

    // Test invalid ZIP code
    cy.get('input[name="zipCode"]').type('invalid');
    cy.get('button').contains('Continue to Payment').click();
    cy.contains('Invalid ZIP code format').should('be.visible');

    // Fill valid data
    cy.get('input[name="street"]').type(shippingAddress.street);
    cy.get('input[name="city"]').type(shippingAddress.city);
    cy.get('input[name="state"]').click();
    cy.get('li').contains(shippingAddress.state).click();
    cy.get('input[name="zipCode"]').clear().type(shippingAddress.zipCode);

    // Should proceed to next step
    cy.get('button').contains('Continue to Payment').click();
    cy.contains('Payment Method').should('be.visible');
  });

  it('should handle order placement errors', () => {
    // Mock order creation failure
    cy.intercept('POST', '/api/orders', {
      statusCode: 400,
      body: {
        success: false,
        error: {
          code: 'INSUFFICIENT_INVENTORY',
          message: 'Insufficient inventory for Test Product 1'
        }
      }
    }).as('createOrderError');

    // Login and go through checkout
    cy.visit('/login');
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();
    cy.wait('@login');

    cy.visit('/checkout');

    // Fill shipping form
    cy.get('input[name="street"]').type(shippingAddress.street);
    cy.get('input[name="city"]').type(shippingAddress.city);
    cy.get('input[name="state"]').click();
    cy.get('li').contains(shippingAddress.state).click();
    cy.get('input[name="zipCode"]').type(shippingAddress.zipCode);
    cy.get('button').contains('Continue to Payment').click();

    // Select payment and continue
    cy.get('button').contains('Review Order').click();

    // Try to place order
    cy.get('button').contains('Place Order').click();
    cy.wait('@createOrderError');

    // Should show error message
    cy.contains('Insufficient inventory for Test Product 1').should('be.visible');
  });

  it('should allow navigation between checkout steps', () => {
    // Login first
    cy.visit('/login');
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();
    cy.wait('@login');

    cy.visit('/checkout');

    // Fill shipping and go to payment
    cy.get('input[name="street"]').type(shippingAddress.street);
    cy.get('input[name="city"]').type(shippingAddress.city);
    cy.get('input[name="state"]').click();
    cy.get('li').contains(shippingAddress.state).click();
    cy.get('input[name="zipCode"]').type(shippingAddress.zipCode);
    cy.get('button').contains('Continue to Payment').click();

    // Go to review
    cy.get('button').contains('Review Order').click();

    // Navigate back to edit shipping
    cy.get('button').contains('Edit').first().click();
    cy.contains('Shipping Information').should('be.visible');
    cy.get('input[name="street"]').should('have.value', shippingAddress.street);

    // Navigate back to payment
    cy.get('button').contains('Continue to Payment').click();
    cy.get('button').contains('Back').click();
    cy.contains('Shipping Information').should('be.visible');
  });
});