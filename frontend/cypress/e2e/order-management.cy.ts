describe('Order Management', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  };

  const adminUser = {
    email: 'admin@example.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User'
  };

  const mockOrders = [
    {
      _id: 'order1',
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
      shippingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'California',
        zipCode: '12345',
        country: 'United States'
      },
      paymentMethod: 'credit_card',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'order2',
      userId: 'user123',
      items: [
        {
          productId: 'product2',
          name: 'Test Product 2',
          quantity: 1,
          price: 49.99
        }
      ],
      totalAmount: 49.99,
      status: 'shipped',
      trackingNumber: 'TRK123456789',
      shippingAddress: {
        street: '456 Another Street',
        city: 'Another City',
        state: 'New York',
        zipCode: '67890',
        country: 'United States'
      },
      paymentMethod: 'paypal',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      updatedAt: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    // Mock user login
    cy.intercept('POST', '/api/auth/login', (req) => {
      const { email } = req.body;
      const isAdmin = email === adminUser.email;
      
      cy.wrap(req).its('body').should('deep.include', {
        email: isAdmin ? adminUser.email : testUser.email
      });

      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: {
            user: {
              _id: isAdmin ? 'admin123' : 'user123',
              email: isAdmin ? adminUser.email : testUser.email,
              firstName: isAdmin ? adminUser.firstName : testUser.firstName,
              lastName: isAdmin ? adminUser.lastName : testUser.lastName,
              role: isAdmin ? 'admin' : 'customer',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            token: 'mock-jwt-token'
          }
        }
      });
    }).as('login');

    // Mock user orders
    cy.intercept('GET', '/api/orders/my-orders*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          data: mockOrders,
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
    }).as('getUserOrders');

    // Mock admin orders (with user details)
    cy.intercept('GET', '/api/orders?*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          data: mockOrders.map(order => ({
            ...order,
            userId: {
              _id: 'user123',
              firstName: testUser.firstName,
              lastName: testUser.lastName,
              email: testUser.email
            }
          })),
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
    }).as('getAdminOrders');

    // Mock order details
    cy.intercept('GET', '/api/orders/order1', {
      statusCode: 200,
      body: {
        success: true,
        data: mockOrders[0]
      }
    }).as('getOrderDetails');

    // Mock order cancellation
    cy.intercept('POST', '/api/orders/order1/cancel', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          ...mockOrders[0],
          status: 'cancelled'
        }
      }
    }).as('cancelOrder');

    // Mock order status update
    cy.intercept('PUT', '/api/orders/order1', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          ...mockOrders[0],
          status: 'processing',
          trackingNumber: 'TRK987654321'
        }
      }
    }).as('updateOrderStatus');
  });

  describe('Customer Order History', () => {
    it('should display user order history', () => {
      // Login as customer
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.wait('@login');

      // Navigate to order history
      cy.visit('/order-history');
      cy.wait('@getUserOrders');

      // Verify page content
      cy.contains('Order History').should('be.visible');
      cy.contains('#ORDER1').should('be.visible');
      cy.contains('#ORDER2').should('be.visible');
      cy.contains('$59.98').should('be.visible');
      cy.contains('$49.99').should('be.visible');
      cy.contains('Pending').should('be.visible');
      cy.contains('Shipped').should('be.visible');
    });

    it('should allow viewing order details', () => {
      // Login and go to order history
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.wait('@login');

      cy.visit('/order-history');
      cy.wait('@getUserOrders');

      // Click view details button
      cy.get('[data-testid="view-order-button"]').first().click();
      cy.wait('@getOrderDetails');

      // Should navigate to order confirmation page
      cy.url().should('include', '/order-confirmation/order1');
      cy.contains('Order Confirmed!').should('be.visible');
      cy.contains('#ORDER1').should('be.visible');
    });

    it('should allow cancelling pending orders', () => {
      // Login and go to order history
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.wait('@login');

      cy.visit('/order-history');
      cy.wait('@getUserOrders');

      // Find pending order and cancel it
      cy.contains('tr', 'Pending').within(() => {
        cy.get('[data-testid="cancel-order-button"]').click();
      });

      // Confirm cancellation
      cy.on('window:confirm', () => true);
      cy.wait('@cancelOrder');
      cy.wait('@getUserOrders'); // Should refresh the list
    });

    it('should show empty state when no orders exist', () => {
      // Mock empty orders response
      cy.intercept('GET', '/api/orders/my-orders*', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            data: [],
            pagination: {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            }
          }
        }
      }).as('getEmptyOrders');

      // Login and go to order history
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.wait('@login');

      cy.visit('/order-history');
      cy.wait('@getEmptyOrders');

      // Should show empty state
      cy.contains('No orders found').should('be.visible');
      cy.contains('You haven\'t placed any orders yet').should('be.visible');
      cy.get('button').contains('Start Shopping').should('be.visible');
    });
  });

  describe('Admin Order Management', () => {
    it('should display all orders for admin users', () => {
      // Login as admin
      cy.visit('/login');
      cy.get('input[name="email"]').type(adminUser.email);
      cy.get('input[name="password"]').type(adminUser.password);
      cy.get('button[type="submit"]').click();
      cy.wait('@login');

      // Navigate to admin orders
      cy.visit('/admin/orders');
      cy.wait('@getAdminOrders');

      // Verify admin page content
      cy.contains('Order Management').should('be.visible');
      cy.contains('Manage all customer orders').should('be.visible');
      cy.contains('#ORDER1').should('be.visible');
      cy.contains('#ORDER2').should('be.visible');
      cy.contains(testUser.firstName).should('be.visible');
      cy.contains(testUser.email).should('be.visible');
    });

    it('should allow updating order status', () => {
      // Login as admin
      cy.visit('/login');
      cy.get('input[name="email"]').type(adminUser.email);
      cy.get('input[name="password"]').type(adminUser.password);
      cy.get('button[type="submit"]').click();
      cy.wait('@login');

      cy.visit('/admin/orders');
      cy.wait('@getAdminOrders');

      // Click edit button for first order
      cy.get('[data-testid="edit-order-button"]').first().click();

      // Update order in dialog
      cy.get('select[name="status"]').select('processing');
      cy.get('input[name="trackingNumber"]').type('TRK987654321');
      cy.get('textarea[name="notes"]').type('Order is being processed');

      // Save changes
      cy.get('button').contains('Update Order').click();
      cy.wait('@updateOrderStatus');
      cy.wait('@getAdminOrders'); // Should refresh the list
    });

    it('should restrict admin access to admin users only', () => {
      // Login as regular customer
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.wait('@login');

      // Try to access admin orders page
      cy.visit('/admin/orders');

      // Should redirect to home page or show access denied
      cy.url().should('not.include', '/admin/orders');
    });
  });

  describe('Order Confirmation Page', () => {
    it('should display order details correctly', () => {
      // Login
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.wait('@login');

      // Visit order confirmation page directly
      cy.visit('/order-confirmation/order1');
      cy.wait('@getOrderDetails');

      // Verify order details
      cy.contains('Order Confirmed!').should('be.visible');
      cy.contains('#ORDER1').should('be.visible');
      cy.contains('Test Product 1').should('be.visible');
      cy.contains('$59.98').should('be.visible');
      cy.contains('123 Test Street').should('be.visible');
      cy.contains('Test City, California 12345').should('be.visible');
      cy.contains('CREDIT CARD').should('be.visible');
    });

    it('should handle order not found', () => {
      // Mock order not found
      cy.intercept('GET', '/api/orders/nonexistent', {
        statusCode: 404,
        body: {
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found'
          }
        }
      }).as('getOrderNotFound');

      // Login
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.wait('@login');

      // Visit non-existent order
      cy.visit('/order-confirmation/nonexistent');
      cy.wait('@getOrderNotFound');

      // Should show error message
      cy.contains('Order not found').should('be.visible');
      cy.get('button').contains('View Order History').should('be.visible');
    });
  });
});