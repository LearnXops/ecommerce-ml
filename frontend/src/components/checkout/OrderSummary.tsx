import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import { Cart } from '@/types';

interface OrderSummaryProps {
  cart: Cart;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ cart }) => {
  const subtotal = cart.totalAmount;
  const shipping: number = 0; // Free shipping for demo
  const tax = subtotal * 0.08; // 8% tax rate for demo
  const total = subtotal + shipping + tax;

  return (
    <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
      <Typography variant="h6" gutterBottom>
        Order Summary
      </Typography>

      <List sx={{ mb: 2 }}>
        {cart.items.map((item) => (
          <ListItem key={item.productId} sx={{ px: 0 }}>
            <ListItemAvatar>
              <Avatar
                src={item.product.images[0]}
                alt={item.product.name}
                variant="rounded"
                sx={{ width: 56, height: 56 }}
              />
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography variant="subtitle2" noWrap>
                  {item.product.name}
                </Typography>
              }
              secondary={
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Qty: {item.quantity}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    ${(item.price * item.quantity).toFixed(2)}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">Subtotal:</Typography>
          <Typography variant="body2">
            ${subtotal.toFixed(2)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">Shipping:</Typography>
          <Typography variant="body2" color="success.main">
            {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">Tax:</Typography>
          <Typography variant="body2">
            ${tax.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Total:</Typography>
        <Typography variant="h6" color="primary">
          ${total.toFixed(2)}
        </Typography>
      </Box>

      <Typography variant="caption" color="text.secondary" display="block">
        * This is a demo application. No actual payment will be processed.
      </Typography>
    </Paper>
  );
};

export default OrderSummary;