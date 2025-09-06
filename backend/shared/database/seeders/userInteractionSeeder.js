"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedUserInteractions = seedUserInteractions;
exports.createTestInteraction = createTestInteraction;
exports.generateRecommendationTrainingData = generateRecommendationTrainingData;
const UserInteraction_1 = require("../../models/UserInteraction");
const User_1 = require("../../models/User");
const Product_1 = require("../../models/Product");
const Order_1 = require("../../models/Order");
const logger_1 = require("../../utils/logger");
async function seedUserInteractions(users, products) {
    try {
        const existingInteractionsCount = await UserInteraction_1.UserInteraction.countDocuments();
        if (existingInteractionsCount > 0) {
            logger_1.logger.info(`Found ${existingInteractionsCount} existing interactions, skipping interaction seeding`);
            return await UserInteraction_1.UserInteraction.find().lean();
        }
        if (!users) {
            users = await User_1.User.find({ role: 'customer' }).lean();
        }
        if (!products) {
            products = await Product_1.Product.find({ isActive: true }).lean();
        }
        if (users.length === 0 || products.length === 0) {
            logger_1.logger.warn('No users or products found, skipping interaction seeding');
            return [];
        }
        logger_1.logger.info('Creating sample user interactions...');
        const createdInteractions = [];
        for (const user of users) {
            try {
                const userInteractions = await generateUserInteractions(user, products);
                createdInteractions.push(...userInteractions);
                logger_1.logger.info(`Created ${userInteractions.length} interactions for user ${user.email}`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to create interactions for user ${user.email}:`, error);
            }
        }
        const orders = await Order_1.Order.find().populate('userId').lean();
        for (const order of orders) {
            try {
                const orderInteractions = await generateOrderBasedInteractions(order);
                createdInteractions.push(...orderInteractions);
            }
            catch (error) {
                logger_1.logger.error(`Failed to create order-based interactions for order ${order._id}:`, error);
            }
        }
        logger_1.logger.info(`Successfully created ${createdInteractions.length} user interactions`);
        return createdInteractions;
    }
    catch (error) {
        logger_1.logger.error('Failed to seed user interactions:', error);
        throw error;
    }
}
async function generateUserInteractions(user, products) {
    const interactions = [];
    const sessionId = generateSessionId();
    const daysToSimulate = 30;
    const interactionsPerDay = Math.floor(Math.random() * 10) + 5;
    for (let day = 0; day < daysToSimulate; day++) {
        const dayInteractions = Math.floor(Math.random() * interactionsPerDay) + 1;
        const currentSessionId = `${sessionId}_day${day}`;
        for (let i = 0; i < dayInteractions; i++) {
            const interactionDate = new Date();
            interactionDate.setDate(interactionDate.getDate() - day);
            interactionDate.setHours(Math.floor(Math.random() * 16) + 8, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
            const product = products[Math.floor(Math.random() * products.length)];
            const interactionType = getRandomInteractionType();
            const interactionData = {
                userId: user._id,
                productId: product._id,
                interactionType,
                timestamp: interactionDate,
                sessionId: currentSessionId
            };
            switch (interactionType) {
                case 'view':
                    interactionData.metadata = {
                        duration: Math.floor(Math.random() * 300) + 10
                    };
                    break;
                case 'cart_add':
                    interactionData.metadata = {
                        quantity: Math.floor(Math.random() * 3) + 1,
                        price: product.price
                    };
                    break;
                case 'wishlist_add':
                    interactionData.metadata = {
                        price: product.price
                    };
                    break;
                case 'purchase':
                    interactionData.metadata = {
                        quantity: Math.floor(Math.random() * 2) + 1,
                        price: product.price
                    };
                    break;
            }
            try {
                const interaction = new UserInteraction_1.UserInteraction(interactionData);
                const savedInteraction = await interaction.save();
                interactions.push(savedInteraction);
            }
            catch (error) {
                logger_1.logger.error(`Failed to create interaction for user ${user.email}:`, error);
            }
        }
    }
    return interactions;
}
async function generateOrderBasedInteractions(order) {
    const interactions = [];
    const sessionId = generateSessionId();
    for (const item of order.items) {
        try {
            const viewInteraction = new UserInteraction_1.UserInteraction({
                userId: order.userId._id || order.userId,
                productId: item.productId,
                interactionType: 'view',
                timestamp: new Date(order.createdAt.getTime() - Math.random() * 3600000),
                sessionId: sessionId,
                metadata: {
                    duration: Math.floor(Math.random() * 180) + 30
                }
            });
            const savedViewInteraction = await viewInteraction.save();
            interactions.push(savedViewInteraction);
            const cartAddInteraction = new UserInteraction_1.UserInteraction({
                userId: order.userId._id || order.userId,
                productId: item.productId,
                interactionType: 'cart_add',
                timestamp: new Date(order.createdAt.getTime() - Math.random() * 1800000),
                sessionId: sessionId,
                metadata: {
                    quantity: item.quantity,
                    price: item.price
                }
            });
            const savedCartAddInteraction = await cartAddInteraction.save();
            interactions.push(savedCartAddInteraction);
            const purchaseInteraction = new UserInteraction_1.UserInteraction({
                userId: order.userId._id || order.userId,
                productId: item.productId,
                interactionType: 'purchase',
                timestamp: order.createdAt,
                sessionId: sessionId,
                metadata: {
                    quantity: item.quantity,
                    price: item.price
                }
            });
            const savedPurchaseInteraction = await purchaseInteraction.save();
            interactions.push(savedPurchaseInteraction);
        }
        catch (error) {
            logger_1.logger.error(`Failed to create order-based interaction for product ${item.productId}:`, error);
        }
    }
    return interactions;
}
function getRandomInteractionType() {
    const random = Math.random();
    if (random < 0.6)
        return 'view';
    if (random < 0.8)
        return 'cart_add';
    if (random < 0.95)
        return 'wishlist_add';
    return 'purchase';
}
function generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
async function createTestInteraction(userId, productId, interactionType, overrides = {}) {
    try {
        const user = await User_1.User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }
        const interactionData = {
            userId: user._id,
            productId: product._id,
            interactionType,
            timestamp: new Date(),
            sessionId: generateSessionId(),
            ...overrides
        };
        if (!interactionData.metadata) {
            switch (interactionType) {
                case 'view':
                    interactionData.metadata = { duration: 60 };
                    break;
                case 'cart_add':
                    interactionData.metadata = { quantity: 1, price: product.price };
                    break;
                case 'wishlist_add':
                    interactionData.metadata = { price: product.price };
                    break;
                case 'purchase':
                    interactionData.metadata = { quantity: 1, price: product.price };
                    break;
            }
        }
        const interaction = new UserInteraction_1.UserInteraction(interactionData);
        const savedInteraction = await interaction.save();
        logger_1.logger.info(`Created test interaction: ${interactionType} for user ${user.email} on product ${product.name}`);
        return savedInteraction;
    }
    catch (error) {
        logger_1.logger.error('Failed to create test interaction:', error);
        throw error;
    }
}
async function generateRecommendationTrainingData() {
    try {
        logger_1.logger.info('Generating additional training data for ML recommendations...');
        const users = await User_1.User.find({ role: 'customer' }).lean();
        const products = await Product_1.Product.find({ isActive: true }).lean();
        if (users.length === 0 || products.length === 0) {
            logger_1.logger.warn('No users or products found for training data generation');
            return [];
        }
        const trainingInteractions = [];
        const categories = [...new Set(products.map(p => p.category))];
        for (const category of categories) {
            const categoryProducts = products.filter(p => p.category === category);
            const interestedUsers = users.slice(0, Math.floor(users.length * 0.3));
            for (const user of interestedUsers) {
                const sessionId = generateSessionId();
                for (let i = 0; i < Math.min(3, categoryProducts.length); i++) {
                    const product = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
                    const interaction = new UserInteraction_1.UserInteraction({
                        userId: user._id,
                        productId: product._id,
                        interactionType: Math.random() > 0.7 ? 'cart_add' : 'view',
                        timestamp: new Date(Date.now() - Math.random() * 2592000000),
                        sessionId: sessionId,
                        metadata: {
                            duration: Math.floor(Math.random() * 200) + 30,
                            quantity: Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 1 : undefined,
                            price: product.price
                        }
                    });
                    try {
                        const savedInteraction = await interaction.save();
                        trainingInteractions.push(savedInteraction);
                    }
                    catch (error) {
                        logger_1.logger.error(`Failed to create training interaction:`, error);
                    }
                }
            }
        }
        logger_1.logger.info(`Generated ${trainingInteractions.length} additional training interactions`);
        return trainingInteractions;
    }
    catch (error) {
        logger_1.logger.error('Failed to generate recommendation training data:', error);
        throw error;
    }
}
//# sourceMappingURL=userInteractionSeeder.js.map