import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
} from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';

interface ShippingData {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface ShippingFormProps {
  initialData: ShippingData;
  onSubmit: (data: ShippingData) => void;
  onBack: () => void;
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

const ShippingForm: React.FC<ShippingFormProps> = ({ initialData, onSubmit, onBack }) => {
  const [formData, setFormData] = useState<ShippingData>(initialData);
  const [errors, setErrors] = useState<Partial<ShippingData>>({});

  const handleChange = (field: keyof ShippingData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ShippingData> = {};

    if (!formData.street.trim()) {
      newErrors.street = 'Street address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required';
    } else if (!/^[0-9]{5}(-[0-9]{4})?$/.test(formData.zipCode)) {
      newErrors.zipCode = 'Invalid ZIP code format (12345 or 12345-6789)';
    }

    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Shipping Information
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Street Address"
              value={formData.street}
              onChange={handleChange('street')}
              error={!!errors.street}
              helperText={errors.street}
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City"
              value={formData.city}
              onChange={handleChange('city')}
              error={!!errors.city}
              helperText={errors.city}
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              select
              label="State"
              value={formData.state}
              onChange={handleChange('state')}
              error={!!errors.state}
              helperText={errors.state}
              required
            >
              {US_STATES.map((state) => (
                <MenuItem key={state} value={state}>
                  {state}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="ZIP Code"
              value={formData.zipCode}
              onChange={handleChange('zipCode')}
              error={!!errors.zipCode}
              helperText={errors.zipCode}
              placeholder="12345 or 12345-6789"
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Country"
              value={formData.country}
              onChange={handleChange('country')}
              error={!!errors.country}
              helperText={errors.country}
              required
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={onBack}
          >
            Back to Cart
          </Button>
          
          <Button
            type="submit"
            variant="contained"
            endIcon={<ArrowForward />}
          >
            Continue to Payment
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default ShippingForm;