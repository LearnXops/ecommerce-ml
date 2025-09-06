import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  CreditCard,
  AccountBalance,
  Apple,
  Google,
} from '@mui/icons-material';

interface PaymentData {
  paymentMethod: string;
}

interface PaymentFormProps {
  initialData: PaymentData;
  onSubmit: (data: PaymentData) => void;
  onBack: () => void;
}

const paymentMethods = [
  {
    value: 'credit_card',
    label: 'Credit Card',
    icon: <CreditCard />,
    description: 'Pay with your credit or debit card'
  },
  {
    value: 'debit_card',
    label: 'Debit Card',
    icon: <CreditCard />,
    description: 'Pay with your debit card'
  },
  {
    value: 'paypal',
    label: 'PayPal',
    icon: <AccountBalance />,
    description: 'Pay with your PayPal account'
  },
  {
    value: 'apple_pay',
    label: 'Apple Pay',
    icon: <Apple />,
    description: 'Pay with Apple Pay'
  },
  {
    value: 'google_pay',
    label: 'Google Pay',
    icon: <Google />,
    description: 'Pay with Google Pay'
  },
];

const PaymentForm: React.FC<PaymentFormProps> = ({ initialData, onSubmit, onBack }) => {
  const [formData, setFormData] = useState<PaymentData>(initialData);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      paymentMethod: event.target.value
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(formData);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Payment Method
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        This is a demo application. No actual payment will be processed.
      </Alert>

      <Box component="form" onSubmit={handleSubmit}>
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ mb: 2 }}>
            Select Payment Method
          </FormLabel>
          
          <RadioGroup
            value={formData.paymentMethod}
            onChange={handleChange}
            sx={{ gap: 1 }}
          >
            {paymentMethods.map((method) => (
              <Paper
                key={method.value}
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: formData.paymentMethod === method.value ? 2 : 1,
                  borderColor: formData.paymentMethod === method.value ? 'primary.main' : 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                  }
                }}
                onClick={() => setFormData({ paymentMethod: method.value })}
              >
                <FormControlLabel
                  value={method.value}
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      {method.icon}
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {method.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {method.description}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ 
                    margin: 0,
                    width: '100%',
                    '& .MuiFormControlLabel-label': {
                      width: '100%'
                    }
                  }}
                />
              </Paper>
            ))}
          </RadioGroup>
        </FormControl>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={onBack}
          >
            Back
          </Button>
          
          <Button
            type="submit"
            variant="contained"
            endIcon={<ArrowForward />}
          >
            Review Order
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default PaymentForm;