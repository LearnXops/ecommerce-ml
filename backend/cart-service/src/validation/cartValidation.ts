import Joi from 'joi';

// Cart item validation schema for adding items
export const cartItemSchema = Joi.object({
  productId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.empty': 'Product ID is required',
      'string.pattern.base': 'Product ID must be a valid MongoDB ObjectId',
      'any.required': 'Product ID is required'
    }),

  quantity: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be an integer',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 100',
      'any.required': 'Quantity is required'
    })
});

// Cart item update validation schema
export const cartUpdateSchema = Joi.object({
  quantity: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be an integer',
      'number.min': 'Quantity must be at least 0',
      'number.max': 'Quantity cannot exceed 100',
      'any.required': 'Quantity is required'
    })
});

// Bulk cart operations validation schema
export const bulkCartOperationSchema = Joi.object({
  items: Joi.array()
    .items(cartItemSchema)
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'array.max': 'Cannot process more than 50 items at once',
      'any.required': 'Items array is required'
    })
});

// Cart merge validation schema (for merging guest cart with user cart)
export const cartMergeSchema = Joi.object({
  guestCartItems: Joi.array()
    .items(Joi.object({
      productId: Joi.string()
        .required()
        .pattern(/^[0-9a-fA-F]{24}$/),
      quantity: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .required()
    }))
    .max(50)
    .default([])
    .messages({
      'array.max': 'Cannot merge more than 50 items'
    }),

  mergeStrategy: Joi.string()
    .valid('replace', 'add', 'keep_existing')
    .default('add')
    .messages({
      'any.only': 'Merge strategy must be one of: replace, add, keep_existing'
    })
});

// Validation functions
export const validateCartItem = (data: any) => {
  return cartItemSchema.validate(data, { abortEarly: false });
};

export const validateCartUpdate = (data: any) => {
  return cartUpdateSchema.validate(data, { abortEarly: false });
};

export const validateBulkCartOperation = (data: any) => {
  return bulkCartOperationSchema.validate(data, { abortEarly: false });
};

export const validateCartMerge = (data: any) => {
  return cartMergeSchema.validate(data, { abortEarly: false });
};