const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
let db;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/ecommerce_orders?authSource=admin';

MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db();
  })
  .catch(error => console.error('MongoDB connection error:', error));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'order-service' });
});

// Get user orders
app.get('/orders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await db.collection('orders').find({ userId }).sort({ createdAt: -1 }).toArray();
    
    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch orders' }
    });
  }
});

// Get order by ID
app.get('/orders/:userId/:orderId', async (req, res) => {
  try {
    const { userId, orderId } = req.params;
    const { ObjectId } = require('mongodb');
    
    const order = await db.collection('orders').findOne({ 
      _id: new ObjectId(orderId), 
      userId 
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch order' }
    });
  }
});

// Create order
app.post('/orders', async (req, res) => {
  try {
    const { userId, items, shippingAddress, paymentMethod, total } = req.body;
    
    const order = {
      userId,
      items,
      shippingAddress,
      paymentMethod,
      total,
      status: 'pending',
      orderNumber: `ORD-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('orders').insertOne(order);
    
    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...order }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Failed to create order' }
    });
  }
});

// Update order status
app.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const { ObjectId } = require('mongodb');
    
    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          status, 
          updatedAt: new Date() 
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
      });
    }
    
    const updatedOrder = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
    
    res.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Failed to update order status' }
    });
  }
});

// Get all orders (admin)
app.get('/orders', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    }
    
    const orders = await db.collection('orders')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .toArray();
    
    const total = await db.collection('orders').countDocuments(query);
    
    res.json({
      success: true,
      data: orders,
      count: orders.length,
      total,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + orders.length) < total
      }
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch orders' }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Order service running on port ${PORT}`);
});

module.exports = app;
