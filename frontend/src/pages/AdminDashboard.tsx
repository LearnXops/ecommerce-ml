import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Dashboard,
  People,
  ShoppingBag,
  TrendingUp,
  Inventory,
  Analytics,
  Edit,
  Visibility,
  ArrowBack,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { User, Product, Order, ApiResponse } from '@/types';

interface DashboardStats {
  users: {
    total: number;
    admins: number;
    customers: number;
    recentRegistrations: number;
  };
  products: {
    total: number;
    categories: number;
    lowStock: number;
  };
  orders: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
  };
  recentUsers: User[];
  recentOrders: Order[];
  topProducts: Product[];
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
    
    fetchDashboardStats();
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all stats in parallel
      const [userStatsRes, productsRes, ordersRes] = await Promise.all([
        api.get<ApiResponse<any>>('/auth/users/stats'),
        api.get<ApiResponse<any>>('/products?limit=5'),
        api.get<ApiResponse<any>>('/orders?limit=5')
      ]);

      // Mock some additional stats since we don't have all endpoints
      const mockStats: DashboardStats = {
        users: {
          total: userStatsRes.data.data?.totalUsers || 0,
          admins: userStatsRes.data.data?.adminUsers || 0,
          customers: userStatsRes.data.data?.customerUsers || 0,
          recentRegistrations: userStatsRes.data.data?.recentRegistrations || 0,
        },
        products: {
          total: productsRes.data.data?.pagination?.total || 0,
          categories: 8, // Mock data
          lowStock: 3, // Mock data
        },
        orders: {
          total: ordersRes.data.data?.pagination?.total || 0,
          pending: 5, // Mock data
          processing: 12, // Mock data
          shipped: 8, // Mock data
          delivered: 25, // Mock data
        },
        recentUsers: userStatsRes.data.data?.recentUsers || [],
        recentOrders: ordersRes.data.data?.data || [],
        topProducts: productsRes.data.data?.data || [],
      };

      setStats(mockStats);
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
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

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/profile')}
          sx={{ mb: 2 }}
        >
          Back to Profile
        </Button>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Dashboard sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Admin Dashboard
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Overview of your ecommerce platform
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {stats && (
        <>
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <People color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Users</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {stats.users.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stats.users.recentRegistrations} new this month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Inventory color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">Products</Typography>
                  </Box>
                  <Typography variant="h4" color="success.main">
                    {stats.products.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stats.products.categories} categories
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ShoppingBag color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">Orders</Typography>
                  </Box>
                  <Typography variant="h4" color="warning.main">
                    {stats.orders.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stats.orders.pending} pending
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUp color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6">Revenue</Typography>
                  </Box>
                  <Typography variant="h4" color="info.main">
                    $12,450
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<People />}
                onClick={() => navigate('/admin/users')}
              >
                Manage Users
              </Button>
              <Button
                variant="contained"
                startIcon={<Inventory />}
                onClick={() => navigate('/admin/products')}
              >
                Manage Products
              </Button>
              <Button
                variant="contained"
                startIcon={<ShoppingBag />}
                onClick={() => navigate('/admin/orders')}
              >
                Manage Orders
              </Button>
              <Button
                variant="contained"
                startIcon={<Analytics />}
                onClick={() => navigate('/admin/recommendations')}
              >
                Analytics
              </Button>
            </Box>
          </Paper>

          {/* Recent Activity */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Users
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Joined</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.recentUsers.slice(0, 5).map((user) => (
                        <TableRow key={user._id}>
                          <TableCell>
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip 
                              label={user.role} 
                              size="small"
                              color={user.role === 'admin' ? 'primary' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/admin/users')}
                  >
                    View All Users
                  </Button>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Orders
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Order ID</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.recentOrders.slice(0, 5).map((order) => (
                        <TableRow key={order._id}>
                          <TableCell>
                            #{order._id.slice(-8).toUpperCase()}
                          </TableCell>
                          <TableCell>
                            ${order.totalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={order.status} 
                              size="small"
                              color={
                                order.status === 'delivered' ? 'success' :
                                order.status === 'shipped' ? 'primary' :
                                order.status === 'processing' ? 'info' : 'warning'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View Order">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/order-confirmation/${order._id}`)}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/admin/orders')}
                  >
                    View All Orders
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default AdminDashboard;