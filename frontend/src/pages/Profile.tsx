import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import { History, ShoppingBag } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>

      <Paper sx={{ p: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Name
              </Typography>
              <Typography variant="body1">
                {user.firstName} {user.lastName}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1">
                {user.email}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Role
              </Typography>
              <Chip 
                label={user.role} 
                color={user.role === 'admin' ? 'primary' : 'default'}
                size="small"
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="h6" gutterBottom>
              Account Details
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Member Since
              </Typography>
              <Typography variant="body1">
                {new Date(user.createdAt).toLocaleDateString()}
              </Typography>
            </Box>

            {user.address && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Address
                </Typography>
                <Typography variant="body1">
                  {user.address.street}<br />
                  {user.address.city}, {user.address.state} {user.address.zipCode}<br />
                  {user.address.country}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<History />}
            onClick={() => navigate('/order-history')}
          >
            Order History
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ShoppingBag />}
            onClick={() => navigate('/')}
          >
            Continue Shopping
          </Button>
          
          {user.role === 'admin' && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<ShoppingBag />}
              onClick={() => navigate('/admin/orders')}
            >
              Manage Orders
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Profile;