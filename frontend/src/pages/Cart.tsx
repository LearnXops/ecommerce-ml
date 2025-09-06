import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ShoppingCartCheckout, ArrowBack } from '@mui/icons-material';
import CartItem from '@/components/CartItem';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, isLoading } = useCart();

  if (!user) {
    return (
      <Container>
        <Alert severity="info" sx={{ mt: 2 }}>
          Please log in to view your cart.
        </Alert>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const cartItems = cart?.items || [];
  const totalAmount = cart?.totalAmount || 0;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Continue Shopping
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Shopping Cart
        </Typography>
      </Box>

      {cartItems.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Your cart is empty
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Add some products to get started!
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            size="large"
          >
            Browse Products
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            {cartItems.map((item) => (
              <CartItem key={item.productId} item={item} />
            ))}
          </Box>

          <Box sx={{ width: { xs: '100%', md: 350 } }}>
            <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                {cartItems.map((item) => (
                  <Box
                    key={item.productId}
                    sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                  >
                    <Typography variant="body2">
                      {item.product.name} × {item.quantity}
                    </Typography>
                    <Typography variant="body2">
                      ${(item.price * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1">
                  ${totalAmount.toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Shipping:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Calculated at checkout
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" color="primary">
                  ${totalAmount.toFixed(2)}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<ShoppingCartCheckout />}
                onClick={() => navigate('/checkout')}
                data-testid="proceed-to-checkout-button"
              >
                Proceed to Checkout
              </Button>
            </Paper>
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default Cart;