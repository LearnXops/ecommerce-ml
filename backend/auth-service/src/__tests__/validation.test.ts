import { registerSchema, loginSchema, updateProfileSchema } from '../validation/authValidation';

describe('Auth Validation Schemas', () => {
  describe('registerSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'John',
      lastName: 'Doe'
    };

    it('should validate correct registration data', () => {
      const { error, value } = registerSchema.validate(validData);
      
      expect(error).toBeUndefined();
      expect(value.email).toBe(validData.email);
      expect(value.role).toBe('customer'); // default value
    });

    it('should validate admin role', () => {
      const adminData = { ...validData, role: 'admin' };
      const { error, value } = registerSchema.validate(adminData);
      
      expect(error).toBeUndefined();
      expect(value.role).toBe('admin');
    });

    it('should reject invalid email', () => {
      const invalidData = { ...validData, email: 'invalid-email' };
      const { error } = registerSchema.validate(invalidData);
      
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toContain('valid email');
    });

    it('should reject weak password', () => {
      const weakPasswords = [
        'short',           // too short
        'nouppercase1!',   // no uppercase
        'NOLOWERCASE1!',   // no lowercase
        'NoNumbers!',      // no numbers
        'NoSpecial123'     // no special characters
      ];

      weakPasswords.forEach(password => {
        const invalidData = { ...validData, password };
        const { error } = registerSchema.validate(invalidData);
        
        expect(error).toBeDefined();
      });
    });

    it('should reject invalid names', () => {
      const invalidNames = [
        'John123',    // contains numbers
        'John@',      // contains special characters
        '',           // empty
        'A'.repeat(51) // too long
      ];

      invalidNames.forEach(name => {
        const invalidData = { ...validData, firstName: name };
        const { error } = registerSchema.validate(invalidData);
        
        expect(error).toBeDefined();
      });
    });

    it('should reject invalid role', () => {
      const invalidData = { ...validData, role: 'invalid-role' };
      const { error } = registerSchema.validate(invalidData);
      
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toContain('customer or admin');
    });

    it('should require all mandatory fields', () => {
      const requiredFields = ['email', 'password', 'firstName', 'lastName'];
      
      requiredFields.forEach(field => {
        const incompleteData = { ...validData };
        delete (incompleteData as any)[field];
        
        const { error } = registerSchema.validate(incompleteData);
        expect(error).toBeDefined();
        expect(error?.details[0]?.message).toContain('required');
      });
    });
  });

  describe('loginSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: 'anypassword'
    };

    it('should validate correct login data', () => {
      const { error, value } = loginSchema.validate(validData);
      
      expect(error).toBeUndefined();
      expect(value.email).toBe(validData.email);
      expect(value.password).toBe(validData.password);
    });

    it('should reject invalid email', () => {
      const invalidData = { ...validData, email: 'invalid-email' };
      const { error } = loginSchema.validate(invalidData);
      
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toContain('valid email');
    });

    it('should require email and password', () => {
      const { error: emailError } = loginSchema.validate({ password: 'test' });
      const { error: passwordError } = loginSchema.validate({ email: 'test@example.com' });
      
      expect(emailError).toBeDefined();
      expect(passwordError).toBeDefined();
    });
  });

  describe('updateProfileSchema', () => {
    const validData = {
      firstName: 'Jane',
      lastName: 'Smith',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'United States'
      }
    };

    it('should validate correct update data', () => {
      const { error, value } = updateProfileSchema.validate(validData);
      
      expect(error).toBeUndefined();
      expect(value.firstName).toBe(validData.firstName);
      expect(value.address?.street).toBe(validData.address.street);
    });

    it('should validate partial updates', () => {
      const partialData = { firstName: 'Jane' };
      const { error, value } = updateProfileSchema.validate(partialData);
      
      expect(error).toBeUndefined();
      expect(value.firstName).toBe(partialData.firstName);
    });

    it('should validate address-only updates', () => {
      const addressData = { address: validData.address };
      const { error, value } = updateProfileSchema.validate(addressData);
      
      expect(error).toBeUndefined();
      expect(value.address?.city).toBe(validData.address.city);
    });

    it('should reject empty update', () => {
      const { error } = updateProfileSchema.validate({});
      
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toContain('At least one field');
    });

    it('should reject invalid names', () => {
      const invalidData = { firstName: 'John123' };
      const { error } = updateProfileSchema.validate(invalidData);
      
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toContain('letters and spaces');
    });

    it('should reject invalid ZIP codes', () => {
      const invalidZipCodes = ['123', '12345-', 'ABCDE', '123456'];
      
      invalidZipCodes.forEach(zipCode => {
        const invalidData = {
          address: { ...validData.address, zipCode }
        };
        const { error } = updateProfileSchema.validate(invalidData);
        
        expect(error).toBeDefined();
        expect(error?.details[0]?.message).toContain('valid ZIP code');
      });
    });

    it('should accept valid ZIP code formats', () => {
      const validZipCodes = ['12345', '12345-6789'];
      
      validZipCodes.forEach(zipCode => {
        const validZipData = {
          address: { ...validData.address, zipCode }
        };
        const { error } = updateProfileSchema.validate(validZipData);
        
        expect(error).toBeUndefined();
      });
    });

    it('should require all address fields when address is provided', () => {
      const incompleteAddress = {
        address: {
          street: '123 Main St',
          city: 'New York'
          // missing state and zipCode
        }
      };
      
      const { error } = updateProfileSchema.validate(incompleteAddress);
      expect(error).toBeDefined();
    });

    it('should set default country', () => {
      const addressWithoutCountry = {
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        }
      };
      
      const { error, value } = updateProfileSchema.validate(addressWithoutCountry);
      expect(error).toBeUndefined();
      expect(value.address?.country).toBe('United States');
    });
  });
});