const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
let db;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/ecommerce_products?authSource=admin';

MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db();
    
    // Seed some sample products if collection is empty
    seedProducts();
  })
  .catch(error => console.error('MongoDB connection error:', error));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'product-service' });
});

// Get all products
app.get('/products', async (req, res) => {
  try {
    const products = await db.collection('products').find({}).toArray();
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch products' }
    });
  }
});

// Get product by ID
app.get('/products/:id', async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const product = await db.collection('products').findOne({ _id: new ObjectId(req.params.id) });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' }
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch product' }
    });
  }
});

// Create product (admin)
app.post('/products', async (req, res) => {
  try {
    const product = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('products').insertOne(product);
    
    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...product }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Failed to create product' }
    });
  }
});

// Seed sample products
async function seedProducts() {
  try {
    const count = await db.collection('products').countDocuments();
    if (count === 0) {
      console.log('Seeding sample products...');
      
      const sampleProducts = [
        {
          name: 'Wireless Headphones',
          description: 'High-quality wireless headphones with noise cancellation',
          price: 199.99,
          category: 'Electronics',
          images: ['https://via.placeholder.com/300x300?text=Headphones'],
          inventory: 50,
          tags: ['wireless', 'audio', 'electronics'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Smartphone',
          description: 'Latest smartphone with advanced camera and long battery life',
          price: 699.99,
          category: 'Electronics',
          images: ['https://via.placeholder.com/300x300?text=Smartphone'],
          inventory: 30,
          tags: ['mobile', 'phone', 'electronics'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Running Shoes',
          description: 'Comfortable running shoes for all terrains',
          price: 129.99,
          category: 'Sports',
          images: ['https://via.placeholder.com/300x300?text=Running+Shoes'],
          inventory: 75,
          tags: ['shoes', 'running', 'sports'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Coffee Maker',
          description: 'Automatic coffee maker with programmable settings',
          price: 89.99,
          category: 'Home',
          images: ['https://via.placeholder.com/300x300?text=Coffee+Maker'],
          inventory: 25,
          tags: ['coffee', 'kitchen', 'home'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Laptop',
          description: 'High-performance laptop for work and gaming',
          price: 1299.99,
          category: 'Electronics',
          images: ['https://via.placeholder.com/300x300?text=Laptop'],
          inventory: 15,
          tags: ['laptop', 'computer', 'electronics'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      await db.collection('products').insertMany(sampleProducts);
      console.log('Sample products seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding products:', error);
  }
}

app.listen(PORT, () => {
  console.log(`Product service running on port ${PORT}`);
});

module.exports = app;
