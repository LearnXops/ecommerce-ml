"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedOrders = seedOrders;
exports.createTestOrder = createTestOrder;
const Order_1 = require("../../models/Order");
const User_1 = require("../../models/User");
const Product_1 = require("../../models/Product");
const logger_1 = require("../../utils/logger");
async function seedOrders(users, products) {
    try {
        const existingOrdersCount = await Order_1.Order.countDocuments();
        if (existingOrdersCount > 0) {
            logger_1.logger.info(`Found ${existingOrdersCount} existing orders, skipping order seeding`);
            return await Order_1.Order.find().lean();
        }
        if (!users) {
            users = await User_1.User.find({ role: 'customer' }).lean();
        }
        if (!products) {
            products = await Product_1.Product.find({ isActive: true }).lean();
        }
        if (users.length === 0 || products.length === 0) {
            logger_1.logger.warn('No users or products found, skipping order seeding');
            return [];
        }
        logger_1.logger.info('Creating sample orders...');
        const createdOrders = [];
        const orderScenarios = [
            {
                status: 'delivered',
                paymentStatus: 'completed',
                itemCount: 2,
                daysAgo: 30
            },
            {
                status: 'delivered',
                paymentStatus: 'completed',
                itemCount: 1,
                daysAgo: 25
            },
            {
                status: 'shipped',
                paymentStatus: 'completed',
                itemCount: 3,
                daysAgo: 5
            },
            {
                status: 'processing',
                paymentStatus: 'completed',
                itemCount: 1,
                daysAgo: 2
            },
            {
                status: 'pending',
                paymentStatus: 'pending',
                itemCount: 2,
                daysAgo: 1
            },
            {
                status: 'delivered',
                paymentStatus: 'completed',
                itemCount: 4,
                daysAgo: 15
            },
            {
                status: 'cancelled',
                paymentStatus: 'refunded',
                itemCount: 1,
                daysAgo: 10
            },
            {
                status: 'delivered',
                paymentStatus: 'completed',
                itemCount: 2,
                daysAgo: 45
            }
        ];
        const paymentMethods = ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay'];
        for (let i = 0; i < orderScenarios.length && i < users.length; i++) {
            try {
                const scenario = orderScenarios[i];
                const user = users[i];
                const selectedProducts = getRandomProducts(products, scenario.itemCount);
                const orderItems = selectedProducts.map(product => ({
                    productId: product._id,
                    quantity: Math.floor(Math.random() * 3) + 1,
                    price: product.price,
                    name: product.name
                }));
                const totalAmount = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                const orderDate = new Date();
                orderDate.setDate(orderDate.getDate() - scenario.daysAgo);
                const orderData = {
                    userId: user._id,
                    items: orderItems,
                    totalAmount: Math.round(totalAmount * 100) / 100,
                    status: scenario.status,
                    paymentStatus: scenario.paymentStatus,
                    shippingAddress: user.address || {
                        street: '123 Default Street',
                        city: 'Default City',
                        state: 'CA',
                        zipCode: '90210',
                        country: 'United States'
                    },
                    paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                    createdAt: orderDate,
                    updatedAt: orderDate
                };
                if (['shipped', 'delivered'].includes(scenario.status)) {
                    orderData['trackingNumber'] = `TRK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
                }
                if (Math.random() > 0.7) {
                    const notes = [
                        'Please leave at front door',
                        'Call before delivery',
                        'Gift wrapping requested',
                        'Expedited shipping',
                        'Customer requested specific delivery time'
                    ];
                    orderData['notes'] = notes[Math.floor(Math.random() * notes.length)];
                }
                const order = new Order_1.Order(orderData);
                const savedOrder = await order.save();
                createdOrders.push(savedOrder);
                logger_1.logger.info(`Created order: ${savedOrder._id} for user ${user.email} (${scenario.status})`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to create order ${i + 1}:`, error);
            }
        }
        const remainingUsers = users.slice(orderScenarios.length);
        for (const user of remainingUsers.slice(0, 5)) {
            try {
                const randomProducts = getRandomProducts(products, Math.floor(Math.random() * 3) + 1);
                const orderItems = randomProducts.map(product => ({
                    productId: product._id,
                    quantity: Math.floor(Math.random() * 2) + 1,
                    price: product.price,
                    name: product.name
                }));
                const totalAmount = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                const daysAgo = Math.floor(Math.random() * 60) + 1;
                const orderDate = new Date();
                orderDate.setDate(orderDate.getDate() - daysAgo);
                const orderData = {
                    userId: user._id,
                    items: orderItems,
                    totalAmount: Math.round(totalAmount * 100) / 100,
                    status: 'delivered',
                    paymentStatus: 'completed',
                    shippingAddress: user.address || {
                        street: '123 Default Street',
                        city: 'Default City',
                        state: 'CA',
                        zipCode: '90210',
                        country: 'United States'
                    },
                    paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                    createdAt: orderDate,
                    updatedAt: orderDate,
                    trackingNumber: `TRK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
                };
                const order = new Order_1.Order(orderData);
                const savedOrder = await order.save();
                createdOrders.push(savedOrder);
                logger_1.logger.info(`Created additional order: ${savedOrder._id} for user ${user.email}`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to create additional order for user ${user.email}:`, error);
            }
        }
        logger_1.logger.info(`Successfully created ${createdOrders.length} orders`);
        return createdOrders;
    }
    catch (error) {
        logger_1.logger.error('Failed to seed orders:', error);
        throw error;
    }
}
function getRandomProducts(products, count) {
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, products.length));
}
async function createTestOrder(userId, productIds, overrides = {}) {
    try {
        const user = await User_1.User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const products = await Product_1.Product.find({ _id: { $in: productIds } });
        if (products.length === 0) {
            throw new Error('No products found');
        }
        const orderItems = products.map(product => ({
            productId: product._id,
            quantity: 1,
            price: product.price,
            name: product.name
        }));
        const totalAmount = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        const orderData = {
            userId: user._id,
            items: orderItems,
            totalAmount: Math.round(totalAmount * 100) / 100,
            status: 'pending',
            paymentStatus: 'pending',
            shippingAddress: user.address || {
                street: '123 Test Street',
                city: 'Test City',
                state: 'CA',
                zipCode: '90210',
                country: 'United States'
            },
            paymentMethod: 'credit_card',
            ...overrides
        };
        const order = new Order_1.Order(orderData);
        const savedOrder = await order.save();
        logger_1.logger.info(`Created test order: ${savedOrder._id} for user ${user.email}`);
        return savedOrder;
    }
    catch (error) {
        logger_1.logger.error('Failed to create test order:', error);
        throw error;
    }
}
//# sourceMappingURL=orderSeeder.js.map