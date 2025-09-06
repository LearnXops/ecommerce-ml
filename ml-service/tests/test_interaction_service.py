"""
Unit tests for interaction service
"""

import unittest
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime
from bson import ObjectId
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from services.interaction_service import InteractionService

class TestInteractionService(unittest.TestCase):
    """Test cases for interaction service"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.mock_db = Mock()
        self.mock_collection = Mock()
        self.mock_db.userinteractions = self.mock_collection
        
        # Mock the create_index method to avoid actual database calls
        self.mock_collection.create_index = Mock()
        
        self.service = InteractionService(self.mock_db)
    
    def test_init_creates_indexes(self):
        """Test that initialization creates database indexes"""
        # Verify that create_index was called multiple times
        self.assertTrue(self.mock_collection.create_index.called)
        self.assertGreater(self.mock_collection.create_index.call_count, 0)
    
    def test_track_interaction_valid_input(self):
        """Test track_interaction with valid input"""
        # Mock successful insertion
        mock_result = Mock()
        mock_result.inserted_id = ObjectId()
        self.mock_collection.insert_one.return_value = mock_result
        
        result = self.service.track_interaction(
            user_id='507f1f77bcf86cd799439011',
            product_id='507f1f77bcf86cd799439012',
            interaction_type='view',
            session_id='session123'
        )
        
        self.assertEqual(result, mock_result.inserted_id)
        self.mock_collection.insert_one.assert_called_once()
        
        # Verify the document structure
        call_args = self.mock_collection.insert_one.call_args[0][0]
        self.assertIn('userId', call_args)
        self.assertIn('productId', call_args)
        self.assertIn('interactionType', call_args)
        self.assertIn('timestamp', call_args)
        self.assertIn('sessionId', call_args)
        self.assertEqual(call_args['interactionType'], 'view')
    
    def test_track_interaction_invalid_type(self):
        """Test track_interaction with invalid interaction type"""
        with self.assertRaises(ValueError):
            self.service.track_interaction(
                user_id='507f1f77bcf86cd799439011',
                product_id='507f1f77bcf86cd799439012',
                interaction_type='invalid_type'
            )
    
    def test_get_user_interactions_valid_user(self):
        """Test get_user_interactions with valid user"""
        # Mock database response
        mock_interactions = [
            {
                '_id': ObjectId(),
                'userId': ObjectId('507f1f77bcf86cd799439011'),
                'productId': ObjectId('507f1f77bcf86cd799439012'),
                'interactionType': 'view',
                'timestamp': datetime.utcnow(),
                'sessionId': 'session123'
            }
        ]
        
        mock_cursor = Mock()
        mock_cursor.sort.return_value.limit.return_value = mock_interactions
        self.mock_collection.find.return_value = mock_cursor
        
        result = self.service.get_user_interactions('507f1f77bcf86cd799439011')
        
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 1)
        
        # Verify ObjectIds are converted to strings
        interaction = result[0]
        self.assertIsInstance(interaction['_id'], str)
        self.assertIsInstance(interaction['userId'], str)
        self.assertIsInstance(interaction['productId'], str)
    
    def test_get_user_interactions_with_filter(self):
        """Test get_user_interactions with interaction type filter"""
        mock_cursor = Mock()
        mock_cursor.sort.return_value.limit.return_value = []
        self.mock_collection.find.return_value = mock_cursor
        
        self.service.get_user_interactions(
            '507f1f77bcf86cd799439011',
            interaction_type='purchase',
            limit=50
        )
        
        # Verify the query includes interaction type filter
        call_args = self.mock_collection.find.call_args[0][0]
        self.assertIn('interactionType', call_args)
        self.assertEqual(call_args['interactionType'], 'purchase')
    
    def test_get_product_interactions_valid_product(self):
        """Test get_product_interactions with valid product"""
        mock_cursor = Mock()
        mock_cursor.sort.return_value.limit.return_value = []
        self.mock_collection.find.return_value = mock_cursor
        
        result = self.service.get_product_interactions('507f1f77bcf86cd799439012')
        
        self.assertIsInstance(result, list)
        self.mock_collection.find.assert_called_once()
        
        # Verify the query structure
        call_args = self.mock_collection.find.call_args[0][0]
        self.assertIn('productId', call_args)
    
    def test_get_interaction_stats_valid_user(self):
        """Test get_interaction_stats with valid user"""
        # Mock aggregation result
        mock_stats = [
            {'_id': 'view', 'count': 10},
            {'_id': 'cart_add', 'count': 3},
            {'_id': 'purchase', 'count': 1}
        ]
        self.mock_collection.aggregate.return_value = mock_stats
        
        result = self.service.get_interaction_stats('507f1f77bcf86cd799439011')
        
        self.assertIsInstance(result, dict)
        self.assertEqual(result['view'], 10)
        self.assertEqual(result['cart_add'], 3)
        self.assertEqual(result['purchase'], 1)
        self.assertEqual(result['total'], 14)
    
    def test_get_user_product_matrix(self):
        """Test get_user_product_matrix"""
        # Mock aggregation result
        mock_matrix = [
            {
                'userId': ObjectId('507f1f77bcf86cd799439011'),
                'productId': ObjectId('507f1f77bcf86cd799439012'),
                'interactions': 5,
                'lastInteraction': datetime.utcnow(),
                'interactionTypes': ['view', 'cart_add']
            }
        ]
        self.mock_collection.aggregate.return_value = mock_matrix
        
        result = self.service.get_user_product_matrix()
        
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 1)
        
        # Verify ObjectIds are converted to strings
        item = result[0]
        self.assertIsInstance(item['userId'], str)
        self.assertIsInstance(item['productId'], str)

if __name__ == '__main__':
    unittest.main()