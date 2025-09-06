import { User } from '../../models/User';
import { logger } from '../../utils/logger';

const sampleUsers = [
  {
    email: 'admin@ecommerce.com',
    password: 'Admin123!@#',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
    address: {
      street: '123 Admin Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'United States'
    }
  },
  {
    email: 'john.doe@example.com',
    password: 'Password123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'customer' as const,
    address: {
      street: '456 Customer Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'United States'
    }
  },
  {
    email: 'jane.smith@example.com',
    password: 'Password123!',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'customer' as const,
    address: {
      street: '789 Buyer Blvd',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'United States'
    }
  },
  {
    email: 'mike.johnson@example.com',
    password: 'Password123!',
    firstName: 'Mike',
    lastName: 'Johnson',
    role: 'customer' as const,
    address: {
      street: '321 Shopper St',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'United States'
    }
  },
  {
    email: 'sarah.wilson@example.com',
    password: 'Password123!',
    firstName: 'Sarah',
    lastName: 'Wilson',
    role: 'customer' as const,
    address: {
      street: '654 Commerce Ct',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'United States'
    }
  },
  {
    email: 'david.brown@example.com',
    password: 'Password123!',
    firstName: 'David',
    lastName: 'Brown',
    role: 'customer' as const
  },
  {
    email: 'lisa.davis@example.com',
    password: 'Password123!',
    firstName: 'Lisa',
    lastName: 'Davis',
    role: 'customer' as const
  },
  {
    email: 'robert.miller@example.com',
    password: 'Password123!',
    firstName: 'Robert',
    lastName: 'Miller',
    role: 'customer' as const
  }
];

export async function seedUsers(): Promise<any[]> {
  try {
    // Check if users already exist
    const existingUsersCount = await User.countDocuments();
    if (existingUsersCount > 0) {
      logger.info(`Found ${existingUsersCount} existing users, skipping user seeding`);
      return await User.find().lean();
    }

    logger.info('Creating sample users...');
    const createdUsers = [];

    for (const userData of sampleUsers) {
      try {
        // Check if user with this email already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          logger.info(`User with email ${userData.email} already exists, skipping`);
          createdUsers.push(existingUser);
          continue;
        }

        const user = new User(userData);
        const savedUser = await user.save();
        createdUsers.push(savedUser);
        
        logger.info(`Created user: ${userData.email} (${userData.role})`);
      } catch (error) {
        logger.error(`Failed to create user ${userData.email}:`, error);
        // Continue with other users even if one fails
      }
    }

    logger.info(`Successfully created ${createdUsers.length} users`);
    return createdUsers;
  } catch (error) {
    logger.error('Failed to seed users:', error);
    throw error;
  }
}

export async function createAdminUser(): Promise<any> {
  try {
    const adminData = sampleUsers[0]; // First user is admin
    
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      logger.info('Admin user already exists');
      return existingAdmin;
    }

    const admin = new User(adminData);
    const savedAdmin = await admin.save();
    
    logger.info('Admin user created successfully');
    return savedAdmin;
  } catch (error) {
    logger.error('Failed to create admin user:', error);
    throw error;
  }
}

export async function createTestCustomers(count: number = 5): Promise<any[]> {
  try {
    const customers = [];
    
    for (let i = 1; i <= count; i++) {
      const customerData = {
        email: `customer${i}@test.com`,
        password: 'TestPassword123!',
        firstName: `Customer`,
        lastName: `${i}`,
        role: 'customer' as const
      };

      const existingCustomer = await User.findOne({ email: customerData.email });
      if (existingCustomer) {
        customers.push(existingCustomer);
        continue;
      }

      const customer = new User(customerData);
      const savedCustomer = await customer.save();
      customers.push(savedCustomer);
      
      logger.info(`Created test customer: ${customerData.email}`);
    }

    return customers;
  } catch (error) {
    logger.error('Failed to create test customers:', error);
    throw error;
  }
}