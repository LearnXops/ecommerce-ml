import Joi from 'joi';

// Valid categories as defined in the Product model
const validCategories = [
  'electronics',
  'clothing',
  'books',
  'home-garden',
  'sports-outdoors',
  'toys-games',
  'health-beauty',
  'automotive',
  'food-beverages',
  'jewelry-accessories',
  'other'
];

// Product creation validation schema
export const productSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Product name is required',
      'string.min': 'Product name must be at least 2 characters long',
      'string.max': 'Product name cannot exceed 200 characters'
    }),

  description: Joi.string()
    .trim()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Product description is required',
      'string.min': 'Product description must be at least 10 characters long',
      'string.max': 'Product description cannot exceed 2000 characters'
    }),

  price: Joi.number()
    .positive()
    .precision(2)
    .max(999999.99)
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be positive',
      'number.max': 'Price cannot exceed $999,999.99',
      'any.required': 'Product price is required'
    }),

  category: Joi.string()
    .valid(...validCategories)
    .required()
    .messages({
      'any.only': `Category must be one of: ${validCategories.join(', ')}`,
      'any.required': 'Product category is required'
    }),

  images: Joi.array()
    .items(Joi.string().uri())
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'Product must have at least 1 image',
      'array.max': 'Product cannot have more than 10 images',
      'string.uri': 'Each image must be a valid URL',
      'any.required': 'Product images are required'
    }),

  inventory: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Inventory must be a number',
      'number.integer': 'Inventory must be an integer',
      'number.min': 'Inventory cannot be negative',
      'any.required': 'Inventory count is required'
    }),

  tags: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .max(20)
    .default([])
    .messages({
      'array.max': 'Product cannot have more than 20 tags',
      'string.min': 'Each tag must be at least 1 character long',
      'string.max': 'Each tag cannot exceed 50 characters'
    }),

  isActive: Joi.boolean().default(true)
});

// Product update validation schema (all fields optional)
export const productUpdateSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'Product name must be at least 2 characters long',
      'string.max': 'Product name cannot exceed 200 characters'
    }),

  description: Joi.string()
    .trim()
    .min(10)
    .max(2000)
    .messages({
      'string.min': 'Product description must be at least 10 characters long',
      'string.max': 'Product description cannot exceed 2000 characters'
    }),

  price: Joi.number()
    .positive()
    .precision(2)
    .max(999999.99)
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be positive',
      'number.max': 'Price cannot exceed $999,999.99'
    }),

  category: Joi.string()
    .valid(...validCategories)
    .messages({
      'any.only': `Category must be one of: ${validCategories.join(', ')}`
    }),

  images: Joi.array()
    .items(Joi.string().uri())
    .min(1)
    .max(10)
    .messages({
      'array.min': 'Product must have at least 1 image',
      'array.max': 'Product cannot have more than 10 images',
      'string.uri': 'Each image must be a valid URL'
    }),

  inventory: Joi.number()
    .integer()
    .min(0)
    .messages({
      'number.base': 'Inventory must be a number',
      'number.integer': 'Inventory must be an integer',
      'number.min': 'Inventory cannot be negative'
    }),

  tags: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .max(20)
    .messages({
      'array.max': 'Product cannot have more than 20 tags',
      'string.min': 'Each tag must be at least 1 character long',
      'string.max': 'Each tag cannot exceed 50 characters'
    }),

  isActive: Joi.boolean()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Product query validation schema
export const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('name', 'price', 'createdAt', 'inventory', 'category').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  category: Joi.string().valid(...validCategories),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  tags: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).custom((value, helpers) => {
    // Convert single string to array
    if (typeof value === 'string') {
      return [value];
    }
    return value;
  }),
  search: Joi.string().trim().min(1).max(100),
  inStock: Joi.boolean()
}).custom((value, helpers) => {
  // Validate price range
  if (value.minPrice !== undefined && value.maxPrice !== undefined) {
    if (value.minPrice > value.maxPrice) {
      return helpers.error('custom.priceRange');
    }
  }
  return value;
}).messages({
  'custom.priceRange': 'Minimum price cannot be greater than maximum price'
});

// Validation functions
export const validateProduct = (data: any) => {
  return productSchema.validate(data, { abortEarly: false });
};

export const validateProductUpdate = (data: any) => {
  return productUpdateSchema.validate(data, { abortEarly: false });
};

export const validateProductQuery = (data: any) => {
  return productQuerySchema.validate(data, { abortEarly: false });
};