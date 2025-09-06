"""
Database connection utilities for ML service
"""

import os
from pymongo import MongoClient
from pymongo.database import Database
import logging

logger = logging.getLogger(__name__)

_client = None
_database = None

def get_database() -> Database:
    """Get MongoDB database connection"""
    global _client, _database
    
    if _database is None:
        try:
            # Get MongoDB connection string from environment
            mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
            db_name = os.getenv('MONGODB_DB_NAME', 'ecommerce')
            
            # Create MongoDB client
            _client = MongoClient(mongo_uri)
            _database = _client[db_name]
            
            # Test connection
            _client.admin.command('ping')
            logger.info(f"Connected to MongoDB database: {db_name}")
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            raise
    
    return _database

def close_connection():
    """Close database connection"""
    global _client, _database
    
    if _client:
        _client.close()
        _client = None
        _database = None
        logger.info("MongoDB connection closed")