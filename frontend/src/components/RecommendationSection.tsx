import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useRecommendations } from '@/hooks/useRecommendations';
import { Recommendation } from '@/types';

interface RecommendationSectionProps {
  title?: string;
  limit?: number;
  showReason?: boolean;
}

const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  title = 'Recommended for You',
  limit = 6,
  showReason = true
}) => {
  const navigate = useNavigate();
  const { recommendations, loading, error, trackInteraction } = useRecommendations(limit);

  const handleProductClick = (productId: string) => {
    trackInteraction(productId, 'view');
    navigate(`/products/${productId}`);
  };

  const handleAddToCart = (productId: string) => {
    trackInteraction(productId, 'cart_add');
    // This would typically trigger the add to cart action
    // For now, just track the interaction
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        Unable to load recommendations at this time. Please try again later.
      </Alert>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show section if no recommendations
  }

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {title}
      </Typography>
      
      <Grid container spacing={3}>
        {recommendations.map((recommendation: Recommendation) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={recommendation.productId}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 4
                }
              }}
              onClick={() => handleProductClick(recommendation.productId)}
            >
              <CardMedia
                component="img"
                height="200"
                image={recommendation.product.images[0] || '/placeholder-product.jpg'}
                alt={recommendation.product.name}
                sx={{ objectFit: 'cover' }}
              />
              
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="h3" noWrap>
                  {recommendation.product.name}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  ${recommendation.product.price.toFixed(2)}
                </Typography>
                
                {showReason && recommendation.reason && (
                  <Chip 
                    label={recommendation.reason} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
                )}
                
                <Typography variant="body2" color="text.secondary" noWrap>
                  {recommendation.product.description}
                </Typography>
              </CardContent>
              
              <CardActions>
                <Button 
                  size="small" 
                  variant="contained" 
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(recommendation.productId);
                  }}
                >
                  Add to Cart
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default RecommendationSection;