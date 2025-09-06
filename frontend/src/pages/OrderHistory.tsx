import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Visibility,
  Receipt,
  ShoppingBag,
  LocalShipping,
  CheckCircle,
  Cancel,
  ArrowBack,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { Order, ApiResponse } from '@/types';

interface OrdersResponse {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const OrderHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user, page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get<ApiResponse<OrdersResponse>>(`/orders/my-orders?page=${page}&limit=10`);
      
      if (response.data.success && response.data.data) {
        setOrders(response.data.data.data);
        setTotalPages(response.data.data.pagination.totalPages);
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch orders');
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await api.post<ApiResponse<Order>>(`/orders/${orderId}/cancel`);
      
      if (response.data.success) {
        // Refresh orders list
        fetchOrders();
      } else {
        throw new Error(response.data.error?.message || 'Failed to cancel order');
      }
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      alert(err.response?.data?.error?.message || err.message || 'Failed to cancel order');
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
        return <Receipt fontSize="small" />;
      case 'processing':
        return <ShoppingBag fontSize="small" />;
      case 'shipped':
        return <LocalShipping fontSize="small" />;
      case 'delivered':
        return <CheckCircle fontSize="small" />;
      case 'cancelled':
        return <Cancel fontSize="small" />;
      default:
        return <Receipt fontSize="small" />;
    }
  };

  const canCancelOrder = (order: Order) => {
    return ['pending', 'processing'].includes(order.status);
  };

  if (!user) {
    return null;
  }

  if (loading && orders.length === 0) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/profile')}
          sx={{ mb: 2 }}
        >
          Back to Profile
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Order History
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {orders.length === 0 && !loading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No orders found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            You haven't placed any orders yet.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
          >
            Start Shopping
          </Button>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        #{order._id.slice(-8).toUpperCase()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {order.items.reduce((total, item) => total + item.quantity, 0)} items
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        ${order.totalAmount.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(order.status)}
                        label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        color={getStatusColor(order.status) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/order-confirmation/${order._id}`)}
                            data-testid="view-order-button"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {canCancelOrder(order) && (
                          <Tooltip title="Cancel Order">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this order?')) {
                                  handleCancelOrder(order._id);
                                }
                              }}
                              data-testid="cancel-order-button"
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default OrderHistory;