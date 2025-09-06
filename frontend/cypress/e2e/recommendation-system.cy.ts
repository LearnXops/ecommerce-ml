describe('Recommendation System', () => {
  beforeEach(() => {
    // Mock the ML service responses
    cy.intercept('GET', '/api/recommendations/*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            productId: 'rec-product-1',
            product: {
              _id: 'rec-product-1',
              name: 'Recommended Wireless Headphones',
              description: 'High-quality wireless headphones with noise cancellation',
              price: 199.99,
              category: 'Electronics',
              images: ['headphones.jpg'],
              inventory: 15,
              tags: ['audio', 'wireless'],
              createdAt: '2023-01-01',
              updatedAt: '2023-01-01'
            },
            score: 0.95,
            reason: 'Similar to your purchases'
          },
          {
            productId: 'rec-product-2',
            product: {
              _id: 'rec-product-2',
              name: 'Recommended Smart Watch',
              description: 'Feature-rich smartwatch with health tracking',
              price: 299.99,
              category: 'Electronics',
              images: ['smartwatch.jpg'],
              inventory: 8,
              tags: ['wearable', 'health'],
              createdAt: '2023-01-01',
              updatedAt: '2023-01-01'
            },
            score: 0.87,
            reason: 'Popular in Electronics'
          }
        ],
        user_id: 'test-user-id',
        count: 2
      }
    }).as('getRecommendations');

    cy.intercept('POST', '/api/interactions', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          interaction_id: 'interaction-123'
        }
      }
    }).as('trackInteraction');

    // Mock auth and other necessary endpoints
    cy.intercept('GET', '/api/products*', { fixture: 'products.json' }).as('getProducts');
    cy.intercept('POST', '/api/auth/login', { fixture: 'auth-success.json' }).as('login');
    cy.intercept('GET', '/api/cart/*', { fixture: 'empty-cart.json' }).as('getCart');
  });

  describe('Homepage Recommendations', () => {
    it('displays recommendations for logged-in users', () => {
      // Login first
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      
      cy.wait('@login');
      
      // Visit homepage
      cy.visit('/');
      
      // Wait for recommendations to load
      cy.wait('@getRecommendations');
      
      // Check that recommendation section is visible
      cy.contains('Recommended for You').should('be.visible');
      
      // Check that recommended products are displayed
      cy.contains('Recommended Wireless Headphones').should('be.visible');
      cy.contains('Recommended Smart Watch').should('be.visible');
      
      // Check prices are displayed
      cy.contains('$199.99').should('be.visible');
      cy.contains('$299.99').should('be.visible');
      
      // Check recommendation reasons are shown
      cy.contains('Similar to your purchases').should('be.visible');
      cy.contains('Popular in Electronics').should('be.visible');
    });

    it('does not show recommendations for anonymous users', () => {
      cy.visit('/');
      
      // Should not see recommendation section
      cy.contains('Recommended for You').should('not.exist');
    });

    it('handles recommendation loading states', () => {
      // Delay the recommendation response
      cy.intercept('GET', '/api/recommendations/*', (req) => {
        req.reply((res) => {
          res.delay(2000);
          res.send({
            statusCode: 200,
            body: {
              success: true,
              data: [],
              user_id: 'test-user-id',
              count: 0
            }
          });
        });
      }).as('getRecommendationsDelayed');

      // Login and visit homepage
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
      
      cy.visit('/');
      
      // Should show loading spinner
      cy.get('[role="progressbar"]').should('be.visible');
      
      // Wait for delayed response
      cy.wait('@getRecommendationsDelayed');
      
      // Loading spinner should disappear
      cy.get('[role="progressbar"]').should('not.exist');
    });

    it('handles recommendation errors gracefully', () => {
      // Mock error response
      cy.intercept('GET', '/api/recommendations/*', {
        statusCode: 500,
        body: {
          success: false,
          error: {
            code: 'RECOMMENDATION_ERROR',
            message: 'Failed to generate recommendations'
          }
        }
      }).as('getRecommendationsError');

      // Login and visit homepage
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
      
      cy.visit('/');
      
      cy.wait('@getRecommendationsError');
      
      // Should show error message
      cy.contains('Unable to load recommendations').should('be.visible');
    });
  });

  describe('Product Detail Recommendations', () => {
    it('shows related product recommendations on product detail page', () => {
      // Mock product detail
      cy.intercept('GET', '/api/products/test-product-1', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            _id: 'test-product-1',
            name: 'Test Product',
            description: 'A test product',
            price: 99.99,
            category: 'Electronics',
            images: ['test.jpg'],
            inventory: 10,
            tags: ['test'],
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01'
          }
        }
      }).as('getProduct');

      // Login first
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
      
      // Visit product detail page
      cy.visit('/products/test-product-1');
      cy.wait('@getProduct');
      
      // Should track view interaction
      cy.wait('@trackInteraction');
      
      // Should show related recommendations
      cy.contains('You Might Also Like').should('be.visible');
      cy.contains('Recommended Wireless Headphones').should('be.visible');
    });

    it('tracks interactions when viewing product details', () => {
      // Mock product detail
      cy.intercept('GET', '/api/products/test-product-1', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            _id: 'test-product-1',
            name: 'Test Product',
            description: 'A test product',
            price: 99.99,
            category: 'Electronics',
            images: ['test.jpg'],
            inventory: 10,
            tags: ['test'],
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01'
          }
        }
      }).as('getProduct');

      // Login and visit product
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
      
      cy.visit('/products/test-product-1');
      cy.wait('@getProduct');
      
      // Verify interaction tracking
      cy.wait('@trackInteraction').then((interception) => {
        expect(interception.request.body).to.deep.include({
          productId: 'test-product-1',
          interactionType: 'view'
        });
      });
    });
  });

  describe('Interaction Tracking', () => {
    beforeEach(() => {
      // Login before each test
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
    });

    it('tracks cart add interactions', () => {
      cy.visit('/');
      cy.wait('@getRecommendations');
      
      // Click add to cart on a recommended product
      cy.contains('Recommended Wireless Headphones')
        .closest('[data-testid="product-card"]')
        .find('button')
        .contains('Add to Cart')
        .click();
      
      // Verify cart add interaction was tracked
      cy.wait('@trackInteraction').then((interception) => {
        expect(interception.request.body).to.deep.include({
          productId: 'rec-product-1',
          interactionType: 'cart_add'
        });
      });
    });

    it('tracks product view interactions from recommendations', () => {
      cy.visit('/');
      cy.wait('@getRecommendations');
      
      // Click on a recommended product
      cy.contains('Recommended Wireless Headphones').click();
      
      // Verify view interaction was tracked
      cy.wait('@trackInteraction').then((interception) => {
        expect(interception.request.body).to.deep.include({
          productId: 'rec-product-1',
          interactionType: 'view'
        });
      });
    });

    it('tracks purchase interactions during checkout', () => {
      // Mock cart with items
      cy.intercept('GET', '/api/cart/*', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            items: [{
              productId: 'test-product-1',
              product: {
                _id: 'test-product-1',
                name: 'Test Product',
                price: 99.99
              },
              quantity: 1,
              price: 99.99
            }],
            totalAmount: 99.99
          }
        }
      }).as('getCartWithItems');

      // Mock order creation
      cy.intercept('POST', '/api/orders', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            _id: 'order-123',
            items: [{
              productId: 'test-product-1',
              quantity: 1,
              price: 99.99
            }],
            totalAmount: 99.99,
            status: 'pending'
          }
        }
      }).as('createOrder');

      // Go through checkout process
      cy.visit('/checkout');
      cy.wait('@getCartWithItems');
      
      // Fill shipping form
      cy.get('[data-testid="street-input"]').type('123 Test St');
      cy.get('[data-testid="city-input"]').type('Test City');
      cy.get('[data-testid="state-input"]').type('TS');
      cy.get('[data-testid="zipcode-input"]').type('12345');
      cy.get('[data-testid="next-button"]').click();
      
      // Fill payment form
      cy.get('[data-testid="payment-method-select"]').select('credit_card');
      cy.get('[data-testid="next-button"]').click();
      
      // Place order
      cy.get('[data-testid="place-order-button"]').click();
      
      cy.wait('@createOrder');
      
      // Verify purchase interaction was tracked
      cy.wait('@trackInteraction').then((interception) => {
        expect(interception.request.body).to.deep.include({
          productId: 'test-product-1',
          interactionType: 'purchase'
        });
      });
    });
  });

  describe('Admin Recommendations Dashboard', () => {
    beforeEach(() => {
      // Mock admin user login
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            user: {
              _id: 'admin-user-id',
              email: 'admin@example.com',
              firstName: 'Admin',
              lastName: 'User',
              role: 'admin'
            },
            token: 'admin-jwt-token'
          }
        }
      }).as('adminLogin');

      // Mock retrain endpoint
      cy.intercept('POST', '/api/retrain', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            message: 'Model retrained successfully',
            timestamp: new Date().toISOString()
          }
        }
      }).as('retrainModel');
    });

    it('allows admin to access recommendations dashboard', () => {
      // Login as admin
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('admin@example.com');
      cy.get('[data-testid="password-input"]').type('admin123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@adminLogin');
      
      // Navigate to admin recommendations
      cy.get('[data-testid="admin-menu-button"]').click();
      cy.get('[data-testid="admin-recommendations-link"]').click();
      
      // Should see admin dashboard
      cy.contains('Recommendation System Analytics').should('be.visible');
      cy.contains('Total Interactions').should('be.visible');
      cy.contains('Active Users').should('be.visible');
    });

    it('allows admin to retrain the model', () => {
      // Login as admin
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('admin@example.com');
      cy.get('[data-testid="password-input"]').type('admin123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@adminLogin');
      
      // Navigate to admin recommendations
      cy.visit('/admin/recommendations');
      
      // Click retrain model button
      cy.get('[data-testid="retrain-model-button"]').click();
      
      // Confirm in dialog
      cy.get('[data-testid="confirm-retrain-button"]').click();
      
      cy.wait('@retrainModel');
      
      // Should show success message
      cy.contains('Model retrained successfully').should('be.visible');
    });

    it('prevents non-admin users from accessing admin dashboard', () => {
      // Login as regular user
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
      
      // Try to access admin recommendations directly
      cy.visit('/admin/recommendations');
      
      // Should see access denied message
      cy.contains('Access denied').should('be.visible');
      cy.contains('Admin privileges required').should('be.visible');
    });
  });

  describe('Fallback Handling', () => {
    it('shows fallback recommendations when ML service is unavailable', () => {
      // Mock ML service failure and fallback to popular products
      cy.intercept('GET', '/api/recommendations/*', {
        statusCode: 500,
        body: {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'ML service unavailable'
          }
        }
      }).as('getRecommendationsError');

      // Mock fallback popular products
      cy.intercept('GET', '/api/products?limit=6&sort=popular', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            products: [
              {
                _id: 'popular-1',
                name: 'Popular Product 1',
                description: 'A popular product',
                price: 49.99,
                category: 'Electronics',
                images: ['popular1.jpg'],
                inventory: 20,
                tags: ['popular']
              }
            ],
            total: 1
          }
        }
      }).as('getFallbackProducts');

      // Login and visit homepage
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
      
      cy.visit('/');
      
      // Should still show recommendations (fallback)
      cy.contains('Recommended for You').should('be.visible');
      cy.contains('Popular Product 1').should('be.visible');
    });
  });
});