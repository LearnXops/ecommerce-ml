import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, ShoppingCartCheckout } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import ShippingForm from '@/components/checkout/ShippingForm';
import PaymentForm from '@/components/checkout/PaymentForm';
import OrderSummary from '@/components/checkout/OrderSummary';
import { api } from '@/utils/api';
import { Order, ApiResponse } from '@/types';

const steps = ['Shipping Information', 'Payment Method', 'Review Order'];

interface ShippingData {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface PaymentData {
  paymentMethod: string;
}

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [shippingData, setShippingData] = useState<ShippingData>({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || 'United States',
  });
  
  const [paymentData, setPaymentData] = useState<PaymentData>({
    paymentMethod: 'credit_card',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!cart || cart.items.length === 0) {
      navigate('/cart');
      return;
    }
  }, [user, cart, navigate]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleShippingSubmit = (data: ShippingData) => {
    setShippingData(data);
    handleNext();
  };

  const handlePaymentSubmit = (data: PaymentData) => {
    setPaymentData(data);
    handleNext();
  };

  const handlePlaceOrder = async () => {
    if (!cart || !user) return;

    setLoading(true);
    setError(null);

    try {
      const orderData = {
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        shippingAddress: shippingData,
        paymentMethod: paymentData.paymentMethod,
      };

      const response = await api.post<ApiResponse<Order>>('/orders', orderData);
      
      if (response.data.success && response.data.data) {
        // Clear cart after successful order
        await clearCart();
        
        // Navigate to order confirmation
        navigate(`/order-confirmation/${response.data.data._id}`, {
          state: { order: response.data.data }
        });
      } else {
        throw new Error(response.data.error?.message || 'Failed to place order');
      }
    } catch (err: any) {
      console.error('Order placement error:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !cart) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <ShippingForm
            initialData={shippingData}
            onSubmit={handleShippingSubmit}
            onBack={() => navigate('/cart')}
          />
        );
      case 1:
        return (
          <PaymentForm
            initialData={paymentData}
            onSubmit={handlePaymentSubmit}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Shipping Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {shippingData.street}<br />
                    {shippingData.city}, {shippingData.state} {shippingData.zipCode}<br />
                    {shippingData.country}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setActiveStep(0)}
                    sx={{ mt: 1 }}
                  >
                    Edit
                  </Button>
                </Paper>

                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Payment Method
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {paymentData.paymentMethod.replace('_', ' ').toUpperCase()}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setActiveStep(1)}
                    sx={{ mt: 1 }}
                  >
                    Edit
                  </Button>
                </Paper>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button onClick={handleBack}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <ShoppingCartCheckout />}
                    size="large"
                  >
                    {loading ? 'Placing Order...' : 'Place Order'}
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <OrderSummary cart={cart} />
              </Grid>
            </Grid>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/cart')}
          sx={{ mb: 2 }}
        >
          Back to Cart
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Checkout
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {getStepContent(activeStep)}
      </Box>
    </Container>
  );
};

export default Checkout;