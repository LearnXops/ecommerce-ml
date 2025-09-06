import Joi from 'joi';

export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            'string.pattern.base': 'Product ID must be a valid MongoDB ObjectId'
          }),
        quantity: Joi.number()
          .integer()
          .min(1)
          .max(100)
          .required()
          .messages({
            'number.min': 'Quantity must be at least 1',
            'number.max': 'Quantity cannot exceed 100'
          })
      })
    )
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'Order must contain at least 1 item',
      'array.max': 'Order cannot contain more than 50 items'
    }),
  shippingAddress: Joi.object({
    street: Joi.string()
      .trim()
      .max(200)
      .required()
      .messages({
        'string.max': 'Street address cannot exceed 200 characters'
      }),
    city: Joi.string()
      .trim()
      .max(100)
      .required()
      .messages({
        'string.max': 'City cannot exceed 100 characters'
      }),
    state: Joi.string()
      .trim()
      .max(100)
      .required()
      .messages({
        'string.max': 'State cannot exceed 100 characters'
      }),
    zipCode: Joi.string()
      .pattern(/^[0-9]{5}(-[0-9]{4})?$/)
      .required()
      .messages({
        'string.pattern.base': 'ZIP code must be in format 12345 or 12345-6789'
      }),
    country: Joi.string()
      .trim()
      .max(100)
      .default('United States')
      .messages({
        'string.max': 'Country cannot exceed 100 characters'
      })
  }).required(),
  paymentMethod: Joi.string()
    .valid('credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay')
    .default('credit_card')
    .messages({
      'any.only': 'Payment method must be one of: credit_card, debit_card, paypal, apple_pay, google_pay'
    }),
  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    })
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'processing', 'shipped', 'delivered', 'cancelled')
    .required()
    .messages({
      'any.only': 'Status must be one of: pending, processing, shipped, delivered, cancelled'
    }),
  trackingNumber: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Tracking number cannot exceed 100 characters'
    }),
  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    })
});

export const processPaymentSchema = Joi.object({
  paymentMethodId: Joi.string()
    .required()
    .messages({
      'any.required': 'Payment method ID is required'
    }),
  savePaymentMethod: Joi.boolean()
    .default(false)
});

export const orderQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  status: Joi.string()
    .valid('pending', 'processing', 'shipped', 'delivered', 'cancelled')
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, processing, shipped, delivered, cancelled'
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'totalAmount', 'status')
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be one of: createdAt, totalAmount, status'
    }),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be asc or desc'
    }),
  dateFrom: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Date from must be in ISO format'
    }),
  dateTo: Joi.date()
    .iso()
    .min(Joi.ref('dateFrom'))
    .optional()
    .messages({
      'date.format': 'Date to must be in ISO format',
      'date.min': 'Date to must be after date from'
    })
});