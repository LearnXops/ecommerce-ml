#!/usr/bin/env python3
"""
Simple test script to verify the Flask app works
"""

import os
import sys
from unittest.mock import Mock, patch

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_app_creation():
    """Test that the Flask app can be created"""
    try:
        # Mock the database and services
        mock_db = Mock()
        mock_recommendation_service = Mock()
        mock_interaction_service = Mock()
        
        with patch('src.database.connection.get_database', return_value=mock_db), \
             patch('src.services.recommendation_service.RecommendationService', return_value=mock_recommendation_service), \
             patch('src.services.interaction_service.InteractionService', return_value=mock_interaction_service):
            
            from app import app
            
            # Test that app was created
            assert app is not None
            print("✓ Flask app created successfully")
            
            # Test health endpoint
            with app.test_client() as client:
                response = client.get('/health')
                assert response.status_code == 200
                print("✓ Health endpoint works")
                
                # Test 404 handling
                response = client.get('/nonexistent')
                assert response.status_code == 404
                print("✓ 404 handling works")
            
            print("✓ All basic app tests passed!")
            return True
            
    except Exception as e:
        print(f"✗ App test failed: {str(e)}")
        return False

if __name__ == '__main__':
    success = test_app_creation()
    sys.exit(0 if success else 1)