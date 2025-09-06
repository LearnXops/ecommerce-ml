import React, { useState, useMemo } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Pagination,
} from '@mui/material';
import ProductCard from '@/components/ProductCard';
import ProductFilters from '@/components/ProductFilters';
import RecommendationSection from '@/components/RecommendationSection';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';

const ProductList: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [page, setPage] = useState(1);
  
  const limit = 12;

  const filters = useMemo(() => ({
    search: search || undefined,
    category: category || undefined,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 1000 ? priceRange[1] : undefined,
    page,
    limit,
  }), [search, category, priceRange, page]);

  const { data, isLoading, error } = useProducts(filters);

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setPriceRange([0, 1000]);
    setPage(1);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
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

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load products. Please try again later.
        </Alert>
      </Container>
    );
  }

  const products = data?.products || [];
  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Products
      </Typography>

      {/* Show recommendations for logged-in users */}
      {user && (
        <RecommendationSection 
          title="Recommended for You" 
          limit={6}
          showReason={true}
        />
      )}

      <ProductFilters
        search={search}
        category={category}
        priceRange={priceRange}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onPriceRangeChange={setPriceRange}
        onClearFilters={handleClearFilters}
      />

      {products.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            No products found matching your criteria.
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" color="text.secondary">
              Showing {products.length} of {data?.total || 0} products
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {products.map((product: any) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
                <ProductCard product={product} />
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default ProductList;