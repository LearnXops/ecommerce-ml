// MongoDB initialization script for ecommerce application

// Switch to admin database for authentication
db = db.getSiblingDB('admin');

// Create databases and collections
const databases = ['ecommerce_auth', 'ecommerce_products', 'ecommerce_orders', 'ecommerce_ml'];

databases.forEach(dbName => {
  print(`Initializing database: ${dbName}`);
  
  // Switch to the database
  db = db.getSiblingDB(dbName);
  
  // Create a dummy collection to ensure database exists
  db.createCollection('_init');
  
  // Create indexes based on database type
  if (dbName === 'ecommerce_auth') {
    db.users.createIndex({ email: 1 }, { unique: true });
    db.users.createIndex({ createdAt: 1 });
  } else if (dbName === 'ecommerce_products') {
    db.products.createIndex({ name: "text", description: "text" });
    db.products.createIndex({ category: 1 });
    db.products.createIndex({ price: 1 });
    db.products.createIndex({ createdAt: 1 });
  } else if (dbName === 'ecommerce_orders') {
    db.orders.createIndex({ userId: 1 });
    db.orders.createIndex({ status: 1 });
    db.orders.createIndex({ createdAt: 1 });
  } else if (dbName === 'ecommerce_ml') {
    db.userinteractions.createIndex({ userId: 1, productId: 1 });
    db.userinteractions.createIndex({ userId: 1, timestamp: 1 });
    db.userinteractions.createIndex({ productId: 1, interactionType: 1 });
  }
  
  print(`Database ${dbName} initialized successfully`);
});

print('MongoDB initialization completed');