"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
describe('Database Models', () => {
    let mongoServer;
    beforeAll(async () => {
        mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose_1.default.connect(mongoUri);
    });
    afterAll(async () => {
        await mongoose_1.default.disconnect();
        await mongoServer.stop();
    });
    beforeEach(async () => {
        await models_1.User.deleteMany({});
        await models_1.Product.deleteMany({});
        await models_1.Order.deleteMany({});
        await models_1.UserInteraction.deleteMany({});
    });
    describe('User Model', () => {
        it('should create a valid user', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User',
                role: 'customer'
            };
            const user = new models_1.User(userData);
            const savedUser = await user.save();
            expect(savedUser.email).toBe(userData.email);
            expect(savedUser.firstName).toBe(userData.firstName);
            expect(savedUser.lastName).toBe(userData.lastName);
            expect(savedUser.role).toBe(userData.role);
            expect(savedUser.password).not.toBe(userData.password);
        });
        it('should validate email format', async () => {
            const userData = {
                email: 'invalid-email',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User'
            };
            const user = new models_1.User(userData);
            await expect(user.save()).rejects.toThrow();
        });
        it('should compare passwords correctly', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User'
            };
            const user = new models_1.User(userData);
            const savedUser = await user.save();
            const isMatch = await savedUser.comparePassword('Password123!');
            expect(isMatch).toBe(true);
            const isNotMatch = await savedUser.comparePassword('WrongPassword');
            expect(isNotMatch).toBe(false);
        });
    });
    describe('Product Model', () => {
        it('should create a valid product', async () => {
            const productData = {
                name: 'Test Product',
                description: 'This is a test product with a detailed description.',
                price: 29.99,
                category: 'electronics',
                images: ['https://example.com/image1.jpg'],
                inventory: 10,
                tags: ['test', 'electronics']
            };
            const product = new models_1.Product(productData);
            const savedProduct = await product.save();
            expect(savedProduct.name).toBe(productData.name);
            expect(savedProduct.price).toBe(productData.price);
            expect(savedProduct.category).toBe(productData.category);
            expect(savedProduct.inventory).toBe(productData.inventory);
            expect(savedProduct.isActive).toBe(true);
        });
        it('should validate price is positive', async () => {
            const productData = {
                name: 'Test Product',
                description: 'This is a test product.',
                price: -10,
                category: 'electronics',
                images: ['https://example.com/image1.jpg'],
                inventory: 10
            };
            const product = new models_1.Product(productData);
            await expect(product.save()).rejects.toThrow();
        });
        it('should check inventory availability', async () => {
            const productData = {
                name: 'Test Product',
                description: 'This is a test product.',
                price: 29.99,
                category: 'electronics',
                images: ['https://example.com/image1.jpg'],
                inventory: 5
            };
            const product = new models_1.Product(productData);
            const savedProduct = await product.save();
            expect(savedProduct.isInStock(3)).toBe(true);
            expect(savedProduct.isInStock(5)).toBe(true);
            expect(savedProduct.isInStock(6)).toBe(false);
        });
    });
    describe('Order Model', () => {
        let user;
        let product;
        beforeEach(async () => {
            user = new models_1.User({
                email: 'test@example.com',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User',
                address: {
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'CA',
                    zipCode: '90210',
                    country: 'United States'
                }
            });
            await user.save();
            product = new models_1.Product({
                name: 'Test Product',
                description: 'This is a test product.',
                price: 29.99,
                category: 'electronics',
                images: ['https://example.com/image1.jpg'],
                inventory: 10
            });
            await product.save();
        });
        it('should create a valid order', async () => {
            const orderData = {
                userId: user._id,
                items: [{
                        productId: product._id,
                        quantity: 2,
                        price: product.price,
                        name: product.name
                    }],
                totalAmount: product.price * 2,
                shippingAddress: user.address,
                paymentMethod: 'credit_card'
            };
            const order = new models_1.Order(orderData);
            const savedOrder = await order.save();
            expect(savedOrder.userId.toString()).toBe(user._id.toString());
            expect(savedOrder.items).toHaveLength(1);
            expect(savedOrder.totalAmount).toBe(orderData.totalAmount);
            expect(savedOrder.status).toBe('pending');
        });
        it('should validate total amount matches items', async () => {
            const orderData = {
                userId: user._id,
                items: [{
                        productId: product._id,
                        quantity: 2,
                        price: product.price,
                        name: product.name
                    }],
                totalAmount: 100,
                shippingAddress: user.address,
                paymentMethod: 'credit_card'
            };
            const order = new models_1.Order(orderData);
            await expect(order.save()).rejects.toThrow();
        });
    });
    describe('UserInteraction Model', () => {
        let user;
        let product;
        beforeEach(async () => {
            user = new models_1.User({
                email: 'test@example.com',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User'
            });
            await user.save();
            product = new models_1.Product({
                name: 'Test Product',
                description: 'This is a test product.',
                price: 29.99,
                category: 'electronics',
                images: ['https://example.com/image1.jpg'],
                inventory: 10
            });
            await product.save();
        });
        it('should create a valid user interaction', async () => {
            const interactionData = {
                userId: user._id,
                productId: product._id,
                interactionType: 'view',
                sessionId: 'test-session-123',
                metadata: {
                    duration: 60
                }
            };
            const interaction = new models_1.UserInteraction(interactionData);
            const savedInteraction = await interaction.save();
            expect(savedInteraction.userId.toString()).toBe(user._id.toString());
            expect(savedInteraction.productId.toString()).toBe(product._id.toString());
            expect(savedInteraction.interactionType).toBe('view');
            expect(savedInteraction.metadata?.duration).toBe(60);
        });
        it('should require quantity for cart_add interactions', async () => {
            const interactionData = {
                userId: user._id,
                productId: product._id,
                interactionType: 'cart_add',
                sessionId: 'test-session-123'
            };
            const interaction = new models_1.UserInteraction(interactionData);
            await expect(interaction.save()).rejects.toThrow();
        });
    });
});
//# sourceMappingURL=models.test.js.map