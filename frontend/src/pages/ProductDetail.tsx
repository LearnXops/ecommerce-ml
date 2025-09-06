import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Box,
  Button,
  TextField,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { ShoppingCart, ArrowBack } from '@mui/icons-material';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  
  const { data: product, isLoading, error } = useProduct(id!);
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    if (product) {
      addToCart(product._id, quantity);
    }
  };

  const handleQuantityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (value > 0 && value <= (product?.inventory || 0)) {
      setQuantity(value);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          Product not found or failed to load.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs>
          <Link 
            component="button" 
            variant="body1" 
            onClick={() => navigate('/')}
            sx={{ textDecoration: 'none' }}
          >
            Home
          </Link>
          <Link 
            component="button" 
            variant="body1" 
            onClick={() => navigate('/')}
            sx={{ textDecoration: 'none' }}
          >
            Products
          </Link>
          <Typography color="text.primary">{product.name}</Typography>
        </Breadcrumbs>
      </Box>

      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2}>
            <Box
              component="img"
              src={product.images[0] || '/placeholder-image.jpg'}
              alt={product.name}
              sx={{
                width: '100%',
                height: 400,
                objectFit: 'cover',
                borderRadius: 1,
              }}
            />
          </Paper>
          
          {product.images.length > 1 && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2, overflowX: 'auto' }}>
              {product.images.slice(1).map((image, index) => (
                <Box
                  key={index}
                  component="img"
                  src={image}
                  alt={`${product.name} ${index + 2}`}
                  sx={{
                    width: 80,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    '&:hover': {
                      border: '2px solid primary.main',
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {product.name}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h5" color="primary" fontWeight="bold">
                ${product.price.toFixed(2)}
              </Typography>
              <Chip label={product.category} color="primary" variant="outlined" />
            </Box>

            <Typography variant="body1" paragraph>
              {product.description}
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                In Stock: {product.inventory} items
              </Typography>
              
              {product.tags.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Tags:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {product.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="body1">Quantity:</Typography>
                <TextField
                  type="number"
                  value={quantity}
                  onChange={handleQuantityChange}
                  inputProps={{
                    min: 1,
                    max: product.inventory,
                  }}
                  size="small"
                  sx={{ width: 80 }}
                />
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<ShoppingCart />}
                onClick={handleAddToCart}
                disabled={product.inventory === 0}
                sx={{ mt: 2 }}
              >
                {product.inventory === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProductDetail;