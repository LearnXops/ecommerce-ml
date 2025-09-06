"""
User interaction tracking service
Handles tracking and storage of user behavior data
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from pymongo.database import Database
import logging

logger = logging.getLogger(__name__)

class InteractionService:
    """Service for tracking user interactions with products"""
    
    def __init__(self, database: Database):
        self.db = database
        self.collection = database.userinteractions
        
        # Create indexes for better query performance
        self._create_indexes()
    
    def _create_indexes(self):
        """Create database indexes for optimal query performance"""
        try:
            # Index for user-based queries
            self.collection.create_index([("userId", 1), ("timestamp", -1)])
            
            # Index for product-based queries
            self.collection.create_index([("productId", 1), ("timestamp", -1)])
            
            # Index for interaction type queries
            self.collection.create_index([("interactionType", 1), ("timestamp", -1)])
            
            # Compound index for user-product queries
            self.collection.create_index([("userId", 1), ("productId", 1)])
            
            logger.info("Created indexes for user interactions collection")
        except Exception as e:
            logger.warning(f"Failed to create indexes: {str(e)}")
    
    def track_interaction(
        self, 
        user_id: str, 
        product_id: str, 
        interaction_type: str,
        session_id: Optional[str] = None
    ) -> ObjectId:
        """
        Track a user interaction with a product
        
        Args:
            user_id: ID of the user
            product_id: ID of the product
            interaction_type: Type of interaction ('view', 'cart_add', 'purchase')
            session_id: Optional session identifier
            
        Returns:
            ObjectId of the created interaction record
        """
        try:
            # Validate interaction type
            valid_types = ['view', 'cart_add', 'purchase']
            if interaction_type not in valid_types:
                raise ValueError(f"Invalid interaction type. Must be one of: {valid_types}")
            
            # Create interaction document
            interaction = {
                'userId': ObjectId(user_id),
                'productId': ObjectId(product_id),
                'interactionType': interaction_type,
                'timestamp': datetime.utcnow(),
                'sessionId': session_id
            }
            
            # Insert into database
            result = self.collection.insert_one(interaction)
            
            logger.info(f"Tracked {interaction_type} interaction for user {user_id} on product {product_id}")
            return result.inserted_id
            
        except Exception as e:
            logger.error(f"Failed to track interaction: {str(e)}")
            raise
    
    def get_user_interactions(
        self, 
        user_id: str, 
        interaction_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get interactions for a specific user
        
        Args:
            user_id: ID of the user
            interaction_type: Optional filter by interaction type
            limit: Maximum number of interactions to return
            
        Returns:
            List of interaction documents
        """
        try:
            # Build query
            query = {'userId': ObjectId(user_id)}
            if interaction_type:
                query['interactionType'] = interaction_type
            
            # Execute query with sorting by timestamp (most recent first)
            cursor = self.collection.find(query).sort('timestamp', -1).limit(limit)
            
            interactions = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                doc['userId'] = str(doc['userId'])
                doc['productId'] = str(doc['productId'])
                interactions.append(doc)
            
            return interactions
            
        except Exception as e:
            logger.error(f"Failed to get user interactions: {str(e)}")
            raise
    
    def get_product_interactions(
        self, 
        product_id: str, 
        interaction_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get interactions for a specific product
        
        Args:
            product_id: ID of the product
            interaction_type: Optional filter by interaction type
            limit: Maximum number of interactions to return
            
        Returns:
            List of interaction documents
        """
        try:
            # Build query
            query = {'productId': ObjectId(product_id)}
            if interaction_type:
                query['interactionType'] = interaction_type
            
            # Execute query
            cursor = self.collection.find(query).sort('timestamp', -1).limit(limit)
            
            interactions = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                doc['userId'] = str(doc['userId'])
                doc['productId'] = str(doc['productId'])
                interactions.append(doc)
            
            return interactions
            
        except Exception as e:
            logger.error(f"Failed to get product interactions: {str(e)}")
            raise
    
    def get_interaction_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get interaction statistics for a user
        
        Args:
            user_id: ID of the user
            
        Returns:
            Dictionary with interaction statistics
        """
        try:
            pipeline = [
                {'$match': {'userId': ObjectId(user_id)}},
                {'$group': {
                    '_id': '$interactionType',
                    'count': {'$sum': 1}
                }}
            ]
            
            result = list(self.collection.aggregate(pipeline))
            
            # Convert to dictionary format
            stats = {item['_id']: item['count'] for item in result}
            
            # Add total count
            stats['total'] = sum(stats.values())
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get interaction stats: {str(e)}")
            raise
    
    def get_user_product_matrix(self) -> List[Dict[str, Any]]:
        """
        Get user-product interaction matrix for collaborative filtering
        
        Returns:
            List of user-product interaction records
        """
        try:
            pipeline = [
                {'$group': {
                    '_id': {
                        'userId': '$userId',
                        'productId': '$productId'
                    },
                    'interactions': {'$sum': 1},
                    'lastInteraction': {'$max': '$timestamp'},
                    'interactionTypes': {'$addToSet': '$interactionType'}
                }},
                {'$project': {
                    'userId': '$_id.userId',
                    'productId': '$_id.productId',
                    'interactions': 1,
                    'lastInteraction': 1,
                    'interactionTypes': 1,
                    '_id': 0
                }}
            ]
            
            result = list(self.collection.aggregate(pipeline))
            
            # Convert ObjectIds to strings
            for item in result:
                item['userId'] = str(item['userId'])
                item['productId'] = str(item['productId'])
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get user-product matrix: {str(e)}")
            raise