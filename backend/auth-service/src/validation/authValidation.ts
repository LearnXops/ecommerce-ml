import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.min': 'First name is required',
      'string.max': 'First name cannot exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters and spaces',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.min': 'Last name is required',
      'string.max': 'Last name cannot exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters and spaces',
      'any.required': 'Last name is required'
    }),
  
  role: Joi.string()
    .valid('customer', 'admin')
    .default('customer')
    .messages({
      'any.only': 'Role must be either customer or admin'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .messages({
      'string.min': 'First name cannot be empty',
      'string.max': 'First name cannot exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters and spaces'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .messages({
      'string.min': 'Last name cannot be empty',
      'string.max': 'Last name cannot exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters and spaces'
    }),
  
  address: Joi.object({
    street: Joi.string()
      .trim()
      .max(200)
      .required()
      .messages({
        'string.max': 'Street address cannot exceed 200 characters',
        'any.required': 'Street address is required'
      }),
    
    city: Joi.string()
      .trim()
      .max(100)
      .required()
      .messages({
        'string.max': 'City cannot exceed 100 characters',
        'any.required': 'City is required'
      }),
    
    state: Joi.string()
      .trim()
      .max(100)
      .required()
      .messages({
        'string.max': 'State cannot exceed 100 characters',
        'any.required': 'State is required'
      }),
    
    zipCode: Joi.string()
      .pattern(/^[0-9]{5}(-[0-9]{4})?$/)
      .required()
      .messages({
        'string.pattern.base': 'Please provide a valid ZIP code (e.g., 12345 or 12345-6789)',
        'any.required': 'ZIP code is required'
      }),
    
    country: Joi.string()
      .trim()
      .max(100)
      .default('United States')
      .messages({
        'string.max': 'Country cannot exceed 100 characters'
      })
  }).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});