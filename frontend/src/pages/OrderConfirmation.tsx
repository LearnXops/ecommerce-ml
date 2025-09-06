import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  ShoppingBag,
  LocalShipping,
  Receipt,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { Order, ApiResponse } from '@/types';

const OrderConfirmation: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!order && orderId) {
      fetchOrder();
    }
  }, [user, order, orderId]);

  const fetchOrder = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const response = await api.get<ApiResponse<Order>>(`/orders/${orderId}`);
      
      if (response.data.success && response.data.data) {
        setOrder(response.data.data);
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch order');
      }
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'shipped':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Receipt />;
      case 'processing':
        return <ShoppingBag />;
      case 'shipped':
        return <LocalShipping />;
      case 'delivered':
        return <CheckCircle />;
      default:
        return <Receipt />;
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || 'Order not found'}
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button onClick={() => navigate('/profile')}>
            View Order History
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Order Confirmed!
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Order #{order._id.slice(-8).toUpperCase()}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Thank you for your order. We'll send you a confirmation email shortly.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Typography variant="h6">Order Status</Typography>
              <Chip
                icon={getStatusIcon(order.status)}
                label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                color={getStatusColor(order.status) as any}
                variant="outlined"
              />
            </Box>

            <Typography variant="h6" gutterBottom>
              Order Items
            </Typography>
            <List>
              {order.items.map((item, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar
                      variant="rounded"
                      sx={{ width: 56, height: 56, bgcolor: 'grey.200' }}
                    >
                      <ShoppingBag />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Quantity: {item.quantity}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Price: ${item.price.toFixed(2)} each
                        </Typography>
                      </Box>
                    }
                  />
                  <Typography variant="subtitle1" fontWeight="medium">
                    ${(item.price * item.quantity).toFixed(2)}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Shipping Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.shippingAddress.street}<br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
              {order.shippingAddress.country}
            </Typography>
            
            {order.trackingNumber && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Tracking Number
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {order.trackingNumber}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Subtotal:</Typography>
                <Typography variant="body2">
                  ${order.totalAmount.toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Shipping:</Typography>
                <Typography variant="body2" color="success.main">
                  Free
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Tax:</Typography>
                <Typography variant="body2">
                  ${(order.totalAmount * 0.08).toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" color="primary">
                ${(order.totalAmount * 1.08).toFixed(2)}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              Payment Method: {order.paymentMethod.replace('_', ' ').toUpperCase()}
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              Order placed on {new Date(order.createdAt).toLocaleDateString()}
            </Typography>
          </Paper>

          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => navigate('/')}
            >
              Continue Shopping
            </Button>
            
            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate('/profile')}
            >
              View Order History
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default OrderConfirmation;