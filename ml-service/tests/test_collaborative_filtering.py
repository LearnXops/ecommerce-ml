"""
Unit tests for collaborative filtering algorithm
"""

import unittest
import numpy as np
from unittest.mock import Mock, patch
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from algorithms.collaborative_filtering import CollaborativeFiltering

class TestCollaborativeFiltering(unittest.TestCase):
    """Test cases for collaborative filtering algorithm"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.cf = CollaborativeFiltering(n_components=5, min_interactions=2)
        
        # Sample interaction data
        self.sample_interactions = [
            {
                'userId': 'user1',
                'productId': 'product1',
                'interactions': 5,
                'interactionTypes': ['view', 'cart_add', 'purchase']
            },
            {
                'userId': 'user1',
                'productId': 'product2',
                'interactions': 3,
                'interactionTypes': ['view', 'cart_add']
            },
            {
                'userId': 'user2',
                'productId': 'product1',
                'interactions': 4,
                'interactionTypes': ['view', 'purchase']
            },
            {
                'userId': 'user2',
                'productId': 'product3',
                'interactions': 2,
                'interactionTypes': ['view']
            },
            {
                'userId': 'user3',
                'productId': 'product2',
                'interactions': 6,
                'interactionTypes': ['view', 'cart_add', 'purchase']
            },
            {
                'userId': 'user3',
                'productId': 'product3',
                'interactions': 3,
                'interactionTypes': ['view', 'cart_add']
            }
        ]
    
    def test_prepare_data_empty_input(self):
        """Test prepare_data with empty input"""
        result = self.cf.prepare_data([])
        self.assertTrue(result.empty)
    
    def test_prepare_data_valid_input(self):
        """Test prepare_data with valid input"""
        result = self.cf.prepare_data(self.sample_interactions)
        
        self.assertFalse(result.empty)
        self.assertIn('userId', result.columns)
        self.assertIn('productId', result.columns)
        self.assertIn('score', result.columns)
    
    def test_create_user_item_matrix_empty_input(self):
        """Test create_user_item_matrix with empty DataFrame"""
        import pandas as pd
        empty_df = pd.DataFrame()
        result = self.cf.create_user_item_matrix(empty_df)
        
        self.assertEqual(result.size, 0)
    
    def test_create_user_item_matrix_valid_input(self):
        """Test create_user_item_matrix with valid input"""
        df = self.cf.prepare_data(self.sample_interactions)
        result = self.cf.create_user_item_matrix(df)
        
        self.assertGreater(result.size, 0)
        self.assertEqual(len(result.shape), 2)
        self.assertGreater(len(self.cf.user_index_map), 0)
        self.assertGreater(len(self.cf.item_index_map), 0)
    
    def test_train_empty_data(self):
        """Test training with empty data"""
        self.cf.train([])
        self.assertFalse(self.cf.is_trained)
    
    def test_train_valid_data(self):
        """Test training with valid data"""
        self.cf.train(self.sample_interactions)
        self.assertTrue(self.cf.is_trained)
        self.assertIsNotNone(self.cf.user_item_matrix)
        self.assertIsNotNone(self.cf.user_similarity_matrix)
    
    def test_get_user_recommendations_untrained_model(self):
        """Test get_user_recommendations with untrained model"""
        recommendations = self.cf.get_user_recommendations('user1')
        self.assertEqual(len(recommendations), 0)
    
    def test_get_user_recommendations_unknown_user(self):
        """Test get_user_recommendations with unknown user"""
        self.cf.train(self.sample_interactions)
        recommendations = self.cf.get_user_recommendations('unknown_user')
        self.assertEqual(len(recommendations), 0)
    
    def test_get_user_recommendations_valid_user(self):
        """Test get_user_recommendations with valid user"""
        self.cf.train(self.sample_interactions)
        recommendations = self.cf.get_user_recommendations('user1', n_recommendations=5)
        
        self.assertIsInstance(recommendations, list)
        # Should return recommendations (product_id, score) tuples
        for rec in recommendations:
            self.assertIsInstance(rec, tuple)
            self.assertEqual(len(rec), 2)
            self.assertIsInstance(rec[0], str)  # product_id
            self.assertIsInstance(rec[1], float)  # score
    
    def test_get_similar_users_untrained_model(self):
        """Test get_similar_users with untrained model"""
        similar_users = self.cf.get_similar_users('user1')
        self.assertEqual(len(similar_users), 0)
    
    def test_get_similar_users_valid_user(self):
        """Test get_similar_users with valid user"""
        self.cf.train(self.sample_interactions)
        similar_users = self.cf.get_similar_users('user1', n_users=2)
        
        self.assertIsInstance(similar_users, list)
        # Should return (user_id, similarity_score) tuples
        for user in similar_users:
            self.assertIsInstance(user, tuple)
            self.assertEqual(len(user), 2)
            self.assertIsInstance(user[0], str)  # user_id
            self.assertIsInstance(user[1], float)  # similarity_score

if __name__ == '__main__':
    unittest.main()