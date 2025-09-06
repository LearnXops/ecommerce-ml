"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedProducts = seedProducts;
exports.seedProductsByCategory = seedProductsByCategory;
exports.createTestProduct = createTestProduct;
const Product_1 = require("../../models/Product");
const logger_1 = require("../../utils/logger");
const sampleProducts = [
    {
        name: 'iPhone 15 Pro',
        description: 'The latest iPhone with advanced camera system, A17 Pro chip, and titanium design. Features a 6.1-inch Super Retina XDR display with ProMotion technology.',
        price: 999.99,
        category: 'electronics',
        images: [
            'https://example.com/images/iphone15pro-1.jpg',
            'https://example.com/images/iphone15pro-2.jpg'
        ],
        inventory: 50,
        tags: ['smartphone', 'apple', 'ios', 'camera', 'premium'],
        isActive: true
    },
    {
        name: 'Samsung Galaxy S24 Ultra',
        description: 'Premium Android smartphone with S Pen, 200MP camera, and AI-powered features. 6.8-inch Dynamic AMOLED display.',
        price: 1199.99,
        category: 'electronics',
        images: [
            'https://example.com/images/galaxy-s24-ultra-1.jpg',
            'https://example.com/images/galaxy-s24-ultra-2.jpg'
        ],
        inventory: 35,
        tags: ['smartphone', 'samsung', 'android', 's-pen', 'camera'],
        isActive: true
    },
    {
        name: 'MacBook Air M3',
        description: 'Ultra-thin laptop powered by Apple M3 chip. 13.6-inch Liquid Retina display, up to 18 hours battery life.',
        price: 1299.99,
        category: 'electronics',
        images: [
            'https://example.com/images/macbook-air-m3-1.jpg',
            'https://example.com/images/macbook-air-m3-2.jpg'
        ],
        inventory: 25,
        tags: ['laptop', 'apple', 'macbook', 'm3-chip', 'portable'],
        isActive: true
    },
    {
        name: 'Sony WH-1000XM5 Headphones',
        description: 'Industry-leading noise canceling wireless headphones with 30-hour battery life and premium sound quality.',
        price: 399.99,
        category: 'electronics',
        images: [
            'https://example.com/images/sony-wh1000xm5-1.jpg',
            'https://example.com/images/sony-wh1000xm5-2.jpg'
        ],
        inventory: 75,
        tags: ['headphones', 'sony', 'wireless', 'noise-canceling', 'audio'],
        isActive: true
    },
    {
        name: 'Levi\'s 501 Original Jeans',
        description: 'Classic straight-leg jeans with the original button fly. Made from 100% cotton denim for authentic vintage look.',
        price: 89.99,
        category: 'clothing',
        images: [
            'https://example.com/images/levis-501-1.jpg',
            'https://example.com/images/levis-501-2.jpg'
        ],
        inventory: 100,
        tags: ['jeans', 'levis', 'denim', 'classic', 'cotton'],
        isActive: true
    },
    {
        name: 'Nike Air Max 270',
        description: 'Lifestyle sneakers with large Air unit in the heel for all-day comfort. Breathable mesh upper with modern design.',
        price: 149.99,
        category: 'clothing',
        images: [
            'https://example.com/images/nike-air-max-270-1.jpg',
            'https://example.com/images/nike-air-max-270-2.jpg'
        ],
        inventory: 80,
        tags: ['sneakers', 'nike', 'air-max', 'comfort', 'lifestyle'],
        isActive: true
    },
    {
        name: 'Patagonia Better Sweater Fleece',
        description: 'Cozy fleece jacket made from recycled polyester. Perfect for outdoor activities and casual wear.',
        price: 119.99,
        category: 'clothing',
        images: [
            'https://example.com/images/patagonia-fleece-1.jpg',
            'https://example.com/images/patagonia-fleece-2.jpg'
        ],
        inventory: 60,
        tags: ['fleece', 'patagonia', 'outdoor', 'sustainable', 'jacket'],
        isActive: true
    },
    {
        name: 'The Psychology of Programming',
        description: 'Classic book on software development psychology and team dynamics. Essential reading for developers and managers.',
        price: 29.99,
        category: 'books',
        images: [
            'https://example.com/images/psychology-programming-1.jpg'
        ],
        inventory: 40,
        tags: ['programming', 'psychology', 'software-development', 'technical', 'management'],
        isActive: true
    },
    {
        name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        description: 'Robert C. Martin\'s guide to writing clean, maintainable code. Includes practical examples and best practices.',
        price: 39.99,
        category: 'books',
        images: [
            'https://example.com/images/clean-code-1.jpg'
        ],
        inventory: 55,
        tags: ['programming', 'clean-code', 'software-engineering', 'best-practices', 'agile'],
        isActive: true
    },
    {
        name: 'Instant Pot Duo 7-in-1',
        description: 'Multi-functional pressure cooker that replaces 7 kitchen appliances. 6-quart capacity perfect for families.',
        price: 79.99,
        category: 'home-garden',
        images: [
            'https://example.com/images/instant-pot-duo-1.jpg',
            'https://example.com/images/instant-pot-duo-2.jpg'
        ],
        inventory: 45,
        tags: ['kitchen', 'pressure-cooker', 'instant-pot', 'cooking', 'appliance'],
        isActive: true
    },
    {
        name: 'Dyson V15 Detect Cordless Vacuum',
        description: 'Powerful cordless vacuum with laser dust detection and intelligent suction adjustment.',
        price: 649.99,
        category: 'home-garden',
        images: [
            'https://example.com/images/dyson-v15-1.jpg',
            'https://example.com/images/dyson-v15-2.jpg'
        ],
        inventory: 20,
        tags: ['vacuum', 'dyson', 'cordless', 'cleaning', 'home'],
        isActive: true
    },
    {
        name: 'Hydro Flask Water Bottle 32oz',
        description: 'Insulated stainless steel water bottle that keeps drinks cold for 24 hours or hot for 12 hours.',
        price: 44.99,
        category: 'sports-outdoors',
        images: [
            'https://example.com/images/hydro-flask-32oz-1.jpg',
            'https://example.com/images/hydro-flask-32oz-2.jpg'
        ],
        inventory: 90,
        tags: ['water-bottle', 'hydro-flask', 'insulated', 'outdoor', 'hydration'],
        isActive: true
    },
    {
        name: 'Yoga Mat Premium 6mm',
        description: 'High-quality yoga mat with superior grip and cushioning. Made from eco-friendly TPE material.',
        price: 59.99,
        category: 'sports-outdoors',
        images: [
            'https://example.com/images/yoga-mat-premium-1.jpg',
            'https://example.com/images/yoga-mat-premium-2.jpg'
        ],
        inventory: 70,
        tags: ['yoga', 'fitness', 'mat', 'exercise', 'eco-friendly'],
        isActive: true
    },
    {
        name: 'Cetaphil Daily Facial Cleanser',
        description: 'Gentle, non-comedogenic facial cleanser suitable for all skin types. Dermatologist recommended.',
        price: 12.99,
        category: 'health-beauty',
        images: [
            'https://example.com/images/cetaphil-cleanser-1.jpg'
        ],
        inventory: 120,
        tags: ['skincare', 'cleanser', 'cetaphil', 'gentle', 'daily-use'],
        isActive: true
    },
    {
        name: 'Olaplex Hair Perfector No. 3',
        description: 'At-home hair treatment that repairs and strengthens damaged hair. Professional salon quality.',
        price: 28.99,
        category: 'health-beauty',
        images: [
            'https://example.com/images/olaplex-no3-1.jpg'
        ],
        inventory: 85,
        tags: ['hair-care', 'olaplex', 'treatment', 'repair', 'professional'],
        isActive: true
    },
    {
        name: 'LEGO Creator 3-in-1 Deep Sea Creatures',
        description: 'Build a shark, squid, or angler fish with this creative LEGO set. 230 pieces for ages 7+.',
        price: 15.99,
        category: 'toys-games',
        images: [
            'https://example.com/images/lego-deep-sea-1.jpg',
            'https://example.com/images/lego-deep-sea-2.jpg'
        ],
        inventory: 65,
        tags: ['lego', 'building', 'creative', 'kids', 'educational'],
        isActive: true
    }
];
async function seedProducts() {
    try {
        const existingProductsCount = await Product_1.Product.countDocuments();
        if (existingProductsCount > 0) {
            logger_1.logger.info(`Found ${existingProductsCount} existing products, skipping product seeding`);
            return await Product_1.Product.find().lean();
        }
        logger_1.logger.info('Creating sample products...');
        const createdProducts = [];
        for (const productData of sampleProducts) {
            try {
                const existingProduct = await Product_1.Product.findOne({ name: productData.name });
                if (existingProduct) {
                    logger_1.logger.info(`Product "${productData.name}" already exists, skipping`);
                    createdProducts.push(existingProduct);
                    continue;
                }
                const product = new Product_1.Product(productData);
                const savedProduct = await product.save();
                createdProducts.push(savedProduct);
                logger_1.logger.info(`Created product: ${productData.name} (${productData.category})`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to create product ${productData.name}:`, error);
            }
        }
        logger_1.logger.info(`Successfully created ${createdProducts.length} products`);
        return createdProducts;
    }
    catch (error) {
        logger_1.logger.error('Failed to seed products:', error);
        throw error;
    }
}
async function seedProductsByCategory(category, count = 10) {
    try {
        const categoryProducts = sampleProducts.filter(p => p.category === category).slice(0, count);
        const createdProducts = [];
        for (const productData of categoryProducts) {
            const existingProduct = await Product_1.Product.findOne({ name: productData.name });
            if (existingProduct) {
                createdProducts.push(existingProduct);
                continue;
            }
            const product = new Product_1.Product(productData);
            const savedProduct = await product.save();
            createdProducts.push(savedProduct);
            logger_1.logger.info(`Created ${category} product: ${productData.name}`);
        }
        return createdProducts;
    }
    catch (error) {
        logger_1.logger.error(`Failed to seed products for category ${category}:`, error);
        throw error;
    }
}
async function createTestProduct(overrides = {}) {
    try {
        const defaultProduct = {
            name: `Test Product ${Date.now()}`,
            description: 'This is a test product created for testing purposes.',
            price: 19.99,
            category: 'other',
            images: ['https://example.com/test-product.jpg'],
            inventory: 10,
            tags: ['test', 'sample'],
            isActive: true,
            ...overrides
        };
        const product = new Product_1.Product(defaultProduct);
        const savedProduct = await product.save();
        logger_1.logger.info(`Created test product: ${defaultProduct.name}`);
        return savedProduct;
    }
    catch (error) {
        logger_1.logger.error('Failed to create test product:', error);
        throw error;
    }
}
//# sourceMappingURL=productSeeder.js.map