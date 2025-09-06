"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedUsers = seedUsers;
exports.createAdminUser = createAdminUser;
exports.createTestCustomers = createTestCustomers;
const User_1 = require("../../models/User");
const logger_1 = require("../../utils/logger");
const sampleUsers = [
    {
        email: 'admin@ecommerce.com',
        password: 'Admin123!@#',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
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
        role: 'customer',
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
        role: 'customer',
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
        role: 'customer',
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
        role: 'customer',
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
        role: 'customer'
    },
    {
        email: 'lisa.davis@example.com',
        password: 'Password123!',
        firstName: 'Lisa',
        lastName: 'Davis',
        role: 'customer'
    },
    {
        email: 'robert.miller@example.com',
        password: 'Password123!',
        firstName: 'Robert',
        lastName: 'Miller',
        role: 'customer'
    }
];
async function seedUsers() {
    try {
        const existingUsersCount = await User_1.User.countDocuments();
        if (existingUsersCount > 0) {
            logger_1.logger.info(`Found ${existingUsersCount} existing users, skipping user seeding`);
            return await User_1.User.find().lean();
        }
        logger_1.logger.info('Creating sample users...');
        const createdUsers = [];
        for (const userData of sampleUsers) {
            try {
                const existingUser = await User_1.User.findOne({ email: userData.email });
                if (existingUser) {
                    logger_1.logger.info(`User with email ${userData.email} already exists, skipping`);
                    createdUsers.push(existingUser);
                    continue;
                }
                const user = new User_1.User(userData);
                const savedUser = await user.save();
                createdUsers.push(savedUser);
                logger_1.logger.info(`Created user: ${userData.email} (${userData.role})`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to create user ${userData.email}:`, error);
            }
        }
        logger_1.logger.info(`Successfully created ${createdUsers.length} users`);
        return createdUsers;
    }
    catch (error) {
        logger_1.logger.error('Failed to seed users:', error);
        throw error;
    }
}
async function createAdminUser() {
    try {
        const adminData = sampleUsers[0];
        const existingAdmin = await User_1.User.findOne({ email: adminData.email });
        if (existingAdmin) {
            logger_1.logger.info('Admin user already exists');
            return existingAdmin;
        }
        const admin = new User_1.User(adminData);
        const savedAdmin = await admin.save();
        logger_1.logger.info('Admin user created successfully');
        return savedAdmin;
    }
    catch (error) {
        logger_1.logger.error('Failed to create admin user:', error);
        throw error;
    }
}
async function createTestCustomers(count = 5) {
    try {
        const customers = [];
        for (let i = 1; i <= count; i++) {
            const customerData = {
                email: `customer${i}@test.com`,
                password: 'TestPassword123!',
                firstName: `Customer`,
                lastName: `${i}`,
                role: 'customer'
            };
            const existingCustomer = await User_1.User.findOne({ email: customerData.email });
            if (existingCustomer) {
                customers.push(existingCustomer);
                continue;
            }
            const customer = new User_1.User(customerData);
            const savedCustomer = await customer.save();
            customers.push(savedCustomer);
            logger_1.logger.info(`Created test customer: ${customerData.email}`);
        }
        return customers;
    }
    catch (error) {
        logger_1.logger.error('Failed to create test customers:', error);
        throw error;
    }
}
//# sourceMappingURL=userSeeder.js.map