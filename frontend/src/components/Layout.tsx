import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Badge, IconButton } from '@mui/material';
import { ShoppingCart, AccountCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cart } = useCart();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const cartItemCount = cart?.items.reduce((total, item) => total + item.quantity, 0) || 0;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ flexGrow: 1, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            Ecommerce App
          </Typography>
          
          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton 
                color="inherit" 
                onClick={() => navigate('/cart')}
                aria-label="shopping cart"
              >
                <Badge badgeContent={cartItemCount} color="secondary">
                  <ShoppingCart />
                </Badge>
              </IconButton>
              
              <Button 
                color="inherit" 
                startIcon={<AccountCircle />}
                onClick={() => navigate('/profile')}
              >
                {user.firstName}
              </Button>
              
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button color="inherit" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button color="inherit" onClick={() => navigate('/register')}>
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      <Box component="main" sx={{ p: 3 }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;