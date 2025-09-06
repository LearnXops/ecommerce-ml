#!/usr/bin/env python3
"""
Integration test for ML recommendation service
Tests the core functionality without Flask test client
"""

import os
import sys
from unittest.mock import Mock

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_recommendation_algorithms():
    """Test the recommendation algorithms directly"""
    try:
        from algorithms.collaborative_filtering import CollaborativeFiltering
        from algorithms.content_based_filtering import ContentBasedFiltering
        from services.interaction_service import InteractionService
        
        print("Testing Collaborative Filtering...")
        
        # Test collaborative filtering
        cf = CollaborativeFiltering()
        sample_interactions = [
            {
                'userId': 'user1',
                'productId': 'product1',
                'interactions': 5,
                'interactionTypes': ['view', 'cart_add', 'purchase']
            },
            {
                'userId': 'user2',
                'productId': 'product1',
                'interactions': 3,
                'interactionTypes': ['view', 'purchase']
            }
        ]
        
        cf.train(sample_interactions)
        assert cf.is_trained, "Collaborative filtering should be trained"
        print("✓ Collaborative filtering training works")
        
        print("Testing Content-Based Filtering...")
        
        # Test content-based filtering
        cbf = ContentBasedFiltering()
        sample_products = [
            {
                '_id': 'product1',
                'name': 'Laptop',
                'description': 'Gaming laptop',
                'category': 'electronics',
                'price': 999.99
            },
            {
                '_id': 'product2',
                'name': 'Mouse',
                'description': 'Wireless mouse',
                'category': 'electronics',
                'price': 29.99
            }
        ]
        
        cbf.train(sample_products)
        assert cbf.is_trained, "Content-based filtering should be trained"
        print("✓ Content-based filtering training works")
        
        # Test similarity
        similar_products = cbf.get_similar_products('product1', n_recommendations=1)
        print(f"✓ Similar products found: {len(similar_products)}")
        
        print("Testing Interaction Service...")
        
        # Test interaction service with mock database
        mock_db = Mock()
        mock_collection = Mock()
        mock_db.userinteractions = mock_collection
        mock_collection.create_index = Mock()
        
        interaction_service = InteractionService(mock_db)
        print("✓ Interaction service initialized")
        
        print("✓ All integration tests passed!")
        return True
        
    except Exception as e:
        print(f"✗ Integration test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_recommendation_algorithms()
    sys.exit(0 if success else 1)