import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  TextField,
  Button,
  Grid,
} from '@mui/material';
import { Add, Remove, Delete } from '@mui/icons-material';
import { CartItem as CartItemType } from '@/types';
import { useCart } from '@/hooks/useCart';

interface CartItemProps {
  item: CartItemType;
}

const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { updateCartItem, removeFromCart } = useCart();

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > 0 && newQuantity <= item.product.inventory) {
      updateCartItem(item.productId, newQuantity);
    }
  };

  const handleRemove = () => {
    removeFromCart(item.productId);
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <Box
              component="img"
              src={item.product.images[0] || '/placeholder-image.jpg'}
              alt={item.product.name}
              sx={{
                width: '100%',
                height: 120,
                objectFit: 'cover',
                borderRadius: 1,
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" gutterBottom>
              {item.product.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {item.product.category}
            </Typography>
            <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
              ${item.price.toFixed(2)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => handleQuantityChange(item.quantity - 1)}
                disabled={item.quantity <= 1}
              >
                <Remove />
              </IconButton>
              
              <TextField
                type="number"
                value={item.quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    handleQuantityChange(value);
                  }
                }}
                inputProps={{
                  min: 1,
                  max: item.product.inventory,
                }}
                size="small"
                sx={{ width: 70 }}
              />
              
              <IconButton
                size="small"
                onClick={() => handleQuantityChange(item.quantity + 1)}
                disabled={item.quantity >= item.product.inventory}
              >
                <Add />
              </IconButton>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Available: {item.product.inventory}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={2}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" gutterBottom>
                ${(item.price * item.quantity).toFixed(2)}
              </Typography>
              
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<Delete />}
                onClick={handleRemove}
              >
                Remove
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default CartItem;