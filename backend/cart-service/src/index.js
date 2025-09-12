const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
let db;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/ecommerce_cart?authSource=admin';

MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db();
  })
  .catch(error => console.error('MongoDB connection error:', error));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'cart-service' });
});

// Get cart
app.get('/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await db.collection('carts').findOne({ userId });
    
    res.json({
      success: true,
      data: cart || { userId, items: [], total: 0 }
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch cart' }
    });
  }
});

// Add item to cart
app.post('/cart/:userId/items', async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, quantity, price } = req.body;
    
    const cart = await db.collection('carts').findOne({ userId });
    
    if (cart) {
      // Update existing cart
      const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
      
      if (existingItemIndex >= 0) {
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        cart.items.push({ productId, quantity, price });
      }
      
      cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      cart.updatedAt = new Date();
      
      await db.collection('carts').updateOne({ userId }, { $set: cart });
    } else {
      // Create new cart
      const newCart = {
        userId,
        items: [{ productId, quantity, price }],
        total: price * quantity,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('carts').insertOne(newCart);
    }
    
    const updatedCart = await db.collection('carts').findOne({ userId });
    
    res.json({
      success: true,
      data: updatedCart
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ADD_ERROR', message: 'Failed to add item to cart' }
    });
  }
});

// Update cart item
app.put('/cart/:userId/items/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const { quantity } = req.body;
    
    const cart = await db.collection('carts').findOne({ userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: { code: 'CART_NOT_FOUND', message: 'Cart not found' }
      });
    }
    
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: 'Item not found in cart' }
      });
    }
    
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }
    
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();
    
    await db.collection('carts').updateOne({ userId }, { $set: cart });
    
    const updatedCart = await db.collection('carts').findOne({ userId });
    
    res.json({
      success: true,
      data: updatedCart
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Failed to update cart item' }
    });
  }
});

// Remove item from cart
app.delete('/cart/:userId/items/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    
    const cart = await db.collection('carts').findOne({ userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: { code: 'CART_NOT_FOUND', message: 'Cart not found' }
      });
    }
    
    cart.items = cart.items.filter(item => item.productId !== productId);
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();
    
    await db.collection('carts').updateOne({ userId }, { $set: cart });
    
    const updatedCart = await db.collection('carts').findOne({ userId });
    
    res.json({
      success: true,
      data: updatedCart
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REMOVE_ERROR', message: 'Failed to remove item from cart' }
    });
  }
});

// Clear cart
app.delete('/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await db.collection('carts').deleteOne({ userId });
    
    res.json({
      success: true,
      data: { message: 'Cart cleared successfully' }
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CLEAR_ERROR', message: 'Failed to clear cart' }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Cart service running on port ${PORT}`);
});

module.exports = app;
