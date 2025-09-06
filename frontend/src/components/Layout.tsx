import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Badge, IconButton, Menu, MenuItem } from '@mui/material';
import { ShoppingCart, AccountCircle, AdminPanelSettings } from '@mui/icons-material';
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
  const [adminMenuAnchor, setAdminMenuAnchor] = React.useState<null | HTMLElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAdminMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAdminMenuAnchor(event.currentTarget);
  };

  const handleAdminMenuClose = () => {
    setAdminMenuAnchor(null);
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
              
              {user.role === 'admin' && (
                <>
                  <Button
                    color="inherit"
                    startIcon={<AdminPanelSettings />}
                    onClick={handleAdminMenuOpen}
                  >
                    Admin
                  </Button>
                  <Menu
                    anchorEl={adminMenuAnchor}
                    open={Boolean(adminMenuAnchor)}
                    onClose={handleAdminMenuClose}
                  >
                    <MenuItem onClick={() => { navigate('/admin/orders'); handleAdminMenuClose(); }}>
                      Order Management
                    </MenuItem>
                    <MenuItem onClick={() => { navigate('/admin/recommendations'); handleAdminMenuClose(); }}>
                      Recommendations
                    </MenuItem>
                  </Menu>
                </>
              )}
              
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