import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material';
import { Refresh, TrendingUp, Analytics, Settings } from '@mui/icons-material';
import { api } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface RecommendationStats {
  totalInteractions: number;
  totalUsers: number;
  interactionsByType: {
    view: number;
    cart_add: number;
    purchase: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    interactions: number;
  }>;
  recentActivity: Array<{
    userId: string;
    productId: string;
    interactionType: string;
    timestamp: string;
  }>;
}

const AdminRecommendations: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrainDialogOpen, setRetrainDialogOpen] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Since we don't have a dedicated stats endpoint, we'll simulate the data
      // In a real implementation, you'd have an admin endpoint for this
      const mockStats: RecommendationStats = {
        totalInteractions: 1250,
        totalUsers: 85,
        interactionsByType: {
          view: 800,
          cart_add: 320,
          purchase: 130
        },
        topProducts: [
          { productId: '1', productName: 'Wireless Headphones', interactions: 45 },
          { productId: '2', productName: 'Smart Watch', interactions: 38 },
          { productId: '3', productName: 'Laptop Stand', interactions: 32 },
          { productId: '4', productName: 'USB-C Hub', interactions: 28 },
          { productId: '5', productName: 'Bluetooth Speaker', interactions: 25 }
        ],
        recentActivity: [
          { userId: 'user1', productId: 'prod1', interactionType: 'purchase', timestamp: new Date().toISOString() },
          { userId: 'user2', productId: 'prod2', interactionType: 'cart_add', timestamp: new Date().toISOString() },
          { userId: 'user3', productId: 'prod3', interactionType: 'view', timestamp: new Date().toISOString() }
        ]
      };
      
      setStats(mockStats);
    } catch (err: any) {
      setError('Failed to load recommendation statistics');
      console.error('Error fetching recommendation stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainResult(null);
    
    try {
      const response = await api.post('/retrain');
      if (response.data.success) {
        setRetrainResult('Model retrained successfully!');
        // Refresh stats after retraining
        setTimeout(fetchStats, 1000);
      } else {
        setRetrainResult('Failed to retrain model');
      }
    } catch (err: any) {
      setRetrainResult('Error during model retraining');
      console.error('Retrain error:', err);
    } finally {
      setRetraining(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          Access denied. Admin privileges required.
        </Alert>
      </Container>
    );
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

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Recommendation System Analytics
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchStats}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Settings />}
              onClick={() => setRetrainDialogOpen(true)}
            >
              Retrain Model
            </Button>
          </Box>
        </Box>
      </Box>

      {stats && (
        <>
          {/* Overview Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Analytics color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Total Interactions</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {stats.totalInteractions.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUp color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">Active Users</Typography>
                  </Box>
                  <Typography variant="h4" color="success.main">
                    {stats.totalUsers}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Views</Typography>
                  <Typography variant="h4" color="info.main">
                    {stats.interactionsByType.view}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Purchases</Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats.interactionsByType.purchase}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Interaction Breakdown */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Interaction Types
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip label="Views" color="info" />
                    <Typography variant="body1">{stats.interactionsByType.view}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip label="Cart Adds" color="warning" />
                    <Typography variant="body1">{stats.interactionsByType.cart_add}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip label="Purchases" color="success" />
                    <Typography variant="body1">{stats.interactionsByType.purchase}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Top Interacted Products
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Interactions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.topProducts.map((product, index) => (
                        <TableRow key={product.productId}>
                          <TableCell>{product.productName}</TableCell>
                          <TableCell align="right">{product.interactions}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Recent Activity */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User ID</TableCell>
                    <TableCell>Product ID</TableCell>
                    <TableCell>Interaction</TableCell>
                    <TableCell>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.recentActivity.map((activity, index) => (
                    <TableRow key={index}>
                      <TableCell>{activity.userId}</TableCell>
                      <TableCell>{activity.productId}</TableCell>
                      <TableCell>
                        <Chip 
                          label={activity.interactionType} 
                          size="small"
                          color={
                            activity.interactionType === 'purchase' ? 'success' :
                            activity.interactionType === 'cart_add' ? 'warning' : 'info'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(activity.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* Retrain Model Dialog */}
      <Dialog open={retrainDialogOpen} onClose={() => setRetrainDialogOpen(false)}>
        <DialogTitle>Retrain Recommendation Model</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This will retrain the recommendation model with the latest user interaction data. 
            The process may take a few minutes to complete.
          </Typography>
          {retrainResult && (
            <Alert severity={retrainResult.includes('success') ? 'success' : 'error'} sx={{ mt: 2 }}>
              {retrainResult}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetrainDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleRetrain} 
            variant="contained"
            disabled={retraining}
            startIcon={retraining ? <CircularProgress size={20} /> : null}
          >
            {retraining ? 'Retraining...' : 'Start Retraining'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminRecommendations;