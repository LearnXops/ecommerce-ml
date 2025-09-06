"""
Unit tests for content-based filtering algorithm
"""

import unittest
import numpy as np
from unittest.mock import Mock, patch
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from algorithms.content_based_filtering import ContentBasedFiltering

class TestContentBasedFiltering(unittest.TestCase):
    """Test cases for content-based filtering algorithm"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.cbf = ContentBasedFiltering(max_features=100)
        
        # Sample product data
        self.sample_products = [
            {
                '_id': 'product1',
                'name': 'Laptop Computer',
                'description': 'High performance laptop for gaming and work',
                'category': 'electronics',
                'price': 999.99,
                'tags': ['laptop', 'computer', 'gaming']
            },
            {
                '_id': 'product2',
                'name': 'Wireless Mouse',
                'description': 'Ergonomic wireless mouse with precision tracking',
                'category': 'electronics',
                'price': 29.99,
                'tags': ['mouse', 'wireless', 'computer']
            },
            {
                '_id': 'product3',
                'name': 'Coffee Mug',
                'description': 'Ceramic coffee mug with handle',
                'category': 'kitchen',
                'price': 12.99,
                'tags': ['mug', 'coffee', 'ceramic']
            },
            {
                '_id': 'product4',
                'name': 'Gaming Keyboard',
                'description': 'Mechanical gaming keyboard with RGB lighting',
                'category': 'electronics',
                'price': 149.99,
                'tags': ['keyboard', 'gaming', 'mechanical']
            }
        ]
        
        # Sample user interactions
        self.sample_interactions = [
            {
                'productId': 'product1',
                'interactionType': 'view'
            },
            {
                'productId': 'product2',
                'interactionType': 'cart_add'
            },
            {
                'productId': 'product1',
                'interactionType': 'purchase'
            }
        ]
    
    def test_prepare_product_data_empty_input(self):
        """Test prepare_product_data with empty input"""
        result = self.cbf.prepare_product_data([])
        self.assertTrue(result.empty)
    
    def test_prepare_product_data_valid_input(self):
        """Test prepare_product_data with valid input"""
        result = self.cbf.prepare_product_data(self.sample_products)
        
        self.assertFalse(result.empty)
        self.assertIn('_id', result.columns)
        self.assertIn('name', result.columns)
        self.assertIn('description', result.columns)
        self.assertIn('category', result.columns)
        self.assertIn('price', result.columns)
        self.assertIn('combined_text', result.columns)
        self.assertIn('price_category', result.columns)
    
    def test_prepare_product_data_missing_fields(self):
        """Test prepare_product_data with missing fields"""
        incomplete_products = [
            {
                '_id': 'product1',
                'name': 'Test Product'
                # Missing other fields
            }
        ]
        
        result = self.cbf.prepare_product_data(incomplete_products)
        
        self.assertFalse(result.empty)
        self.assertEqual(result.iloc[0]['description'], '')
        self.assertEqual(result.iloc[0]['category'], 'uncategorized')
        self.assertEqual(result.iloc[0]['price'], 0)
    
    def test_extract_features_empty_input(self):
        """Test extract_features with empty DataFrame"""
        import pandas as pd
        empty_df = pd.DataFrame()
        result = self.cbf.extract_features(empty_df)
        
        self.assertEqual(result.size, 0)
    
    def test_extract_features_valid_input(self):
        """Test extract_features with valid input"""
        df = self.cbf.prepare_product_data(self.sample_products)
        result = self.cbf.extract_features(df)
        
        self.assertGreater(result.size, 0)
        self.assertEqual(len(result.shape), 2)
        self.assertEqual(result.shape[0], len(df))
    
    def test_train_empty_data(self):
        """Test training with empty data"""
        self.cbf.train([])
        self.assertFalse(self.cbf.is_trained)
    
    def test_train_valid_data(self):
        """Test training with valid data"""
        self.cbf.train(self.sample_products)
        self.assertTrue(self.cbf.is_trained)
        self.assertIsNotNone(self.cbf.product_features)
        self.assertIsNotNone(self.cbf.product_similarity_matrix)
        self.assertGreater(len(self.cbf.product_index_map), 0)
    
    def test_get_similar_products_untrained_model(self):
        """Test get_similar_products with untrained model"""
        recommendations = self.cbf.get_similar_products('product1')
        self.assertEqual(len(recommendations), 0)
    
    def test_get_similar_products_unknown_product(self):
        """Test get_similar_products with unknown product"""
        self.cbf.train(self.sample_products)
        recommendations = self.cbf.get_similar_products('unknown_product')
        self.assertEqual(len(recommendations), 0)
    
    def test_get_similar_products_valid_product(self):
        """Test get_similar_products with valid product"""
        self.cbf.train(self.sample_products)
        recommendations = self.cbf.get_similar_products('product1', n_recommendations=2)
        
        self.assertIsInstance(recommendations, list)
        # Should return recommendations (product_id, score) tuples
        for rec in recommendations:
            self.assertIsInstance(rec, tuple)
            self.assertEqual(len(rec), 2)
            self.assertIsInstance(rec[0], str)  # product_id
            self.assertIsInstance(rec[1], float)  # score
            self.assertNotEqual(rec[0], 'product1')  # Should not recommend itself
    
    def test_get_user_content_recommendations_untrained_model(self):
        """Test get_user_content_recommendations with untrained model"""
        recommendations = self.cbf.get_user_content_recommendations(self.sample_interactions)
        self.assertEqual(len(recommendations), 0)
    
    def test_get_user_content_recommendations_empty_interactions(self):
        """Test get_user_content_recommendations with empty interactions"""
        self.cbf.train(self.sample_products)
        recommendations = self.cbf.get_user_content_recommendations([])
        self.assertEqual(len(recommendations), 0)
    
    def test_get_user_content_recommendations_valid_input(self):
        """Test get_user_content_recommendations with valid input"""
        self.cbf.train(self.sample_products)
        recommendations = self.cbf.get_user_content_recommendations(
            self.sample_interactions, n_recommendations=2
        )
        
        self.assertIsInstance(recommendations, list)
        # Should return recommendations (product_id, score) tuples
        for rec in recommendations:
            self.assertIsInstance(rec, tuple)
            self.assertEqual(len(rec), 2)
            self.assertIsInstance(rec[0], str)  # product_id
            self.assertIsInstance(rec[1], float)  # score
    
    def test_get_category_recommendations(self):
        """Test get_category_recommendations"""
        self.cbf.train(self.sample_products)
        recommendations = self.cbf.get_category_recommendations('electronics', n_recommendations=2)
        
        self.assertIsInstance(recommendations, list)
        # Should return recommendations (product_id, score) tuples
        for rec in recommendations:
            self.assertIsInstance(rec, tuple)
            self.assertEqual(len(rec), 2)
            self.assertIsInstance(rec[0], str)  # product_id
            self.assertIsInstance(rec[1], float)  # score

if __name__ == '__main__':
    unittest.main()