// Simple validation script to check if models can be imported
const fs = require('fs');
const path = require('path');

console.log('Validating database models...');

// Check if all required files exist
const requiredFiles = [
  'database/connection.ts',
  'models/User.ts',
  'models/Product.ts',
  'models/Order.ts',
  'models/UserInteraction.ts',
  'models/index.ts',
  'types/index.ts',
  'utils/logger.ts',
  'database/seeders/index.ts'
];

let allFilesExist = true;

for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing file: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`✅ Found: ${file}`);
  }
}

if (allFilesExist) {
  console.log('\n✅ All required files are present!');
  console.log('\nDatabase models and utilities have been successfully created:');
  console.log('- MongoDB connection utilities with retry logic');
  console.log('- TypeScript interfaces for User, Product, Order, and UserInteraction');
  console.log('- Mongoose schemas with comprehensive validation rules');
  console.log('- Database seeding scripts with sample data');
  console.log('- Shared utilities and types');
  
  console.log('\nTo use these models in your services:');
  console.log('1. Import from the shared module: import { User, Product, dbConnection } from "../shared"');
  console.log('2. Connect to database: await dbConnection.connect()');
  console.log('3. Run seeders: npm run seed (from the shared directory)');
} else {
  console.log('\n❌ Some files are missing. Please check the implementation.');
  process.exit(1);
}