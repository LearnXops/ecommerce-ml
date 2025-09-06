import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import { Clear } from '@mui/icons-material';
import { useCategories } from '@/hooks/useProducts';

interface ProductFiltersProps {
  search: string;
  category: string;
  priceRange: [number, number];
  onSearchChange: (search: string) => void;
  onCategoryChange: (category: string) => void;
  onPriceRangeChange: (range: [number, number]) => void;
  onClearFilters: () => void;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  search,
  category,
  priceRange,
  onSearchChange,
  onCategoryChange,
  onPriceRangeChange,
  onClearFilters,
}) => {
  const { data: categories = [] } = useCategories();

  const handlePriceChange = (_: Event, newValue: number | number[]) => {
    onPriceRangeChange(newValue as [number, number]);
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Filters</Typography>
          <Button
            startIcon={<Clear />}
            onClick={onClearFilters}
            size="small"
          >
            Clear All
          </Button>
        </Box>

        <TextField
          fullWidth
          label="Search products"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Enter product name or description..."
        />

        <FormControl fullWidth>
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            label="Category"
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Typography gutterBottom>
            Price Range: ${priceRange[0]} - ${priceRange[1]}
          </Typography>
          <Slider
            value={priceRange}
            onChange={handlePriceChange}
            valueLabelDisplay="auto"
            min={0}
            max={1000}
            step={10}
            marks={[
              { value: 0, label: '$0' },
              { value: 500, label: '$500' },
              { value: 1000, label: '$1000+' },
            ]}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default ProductFilters;