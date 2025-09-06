"""
Unit tests for API endpoints
"""

import unittest
import json
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

class TestAPIEndpoints(unittest.TestCase):
    """Test cases for Flask API endpoints"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Mock the database and services before importing app
        self.mock_db = Mock()
        self.mock_recommendation_service = Mock()
        self.mock_interaction_service = Mock()
        
        # Patch the imports
        with patch('src.database.connection.get_database', return_value=self.mock_db), \
             patch('src.services.recommendation_service.RecommendationService', return_value=self.mock_recommendation_service), \
             patch('src.services.interaction_service.InteractionService', return_value=self.mock_interaction_service):
            
            from app import app
            self.app = app
            self.app.config['TESTING'] = True
            self.client = self.app.test_client()
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = self.client.get('/health')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')
        self.assertEqual(data['service'], 'ml-recommendation-service')
        self.assertIn('timestamp', data)
    
    def test_get_recommendations_valid_user(self):
        """Test get recommendations endpoint with valid user"""
        # Mock recommendation service response
        mock_recommendations = [
            {
                'productId': 'product1',
                'score': 0.95,
                'algorithm': 'collaborative_filtering',
                'reason': 'Users with similar preferences also liked this',
                'name': 'Test Product',
                'price': 99.99
            }
        ]
        self.mock_recommendation_service.get_recommendations.return_value = mock_recommendations
        
        response = self.client.get('/recommendations/user123?limit=5')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['user_id'], 'user123')
        self.assertEqual(len(data['data']), 1)
        self.assertEqual(data['count'], 1)
        
        # Verify service was called with correct parameters
        self.mock_recommendation_service.get_recommendations.assert_called_once_with('user123', 5)
    
    def test_get_recommendations_service_error(self):
        """Test get recommendations endpoint when service raises error"""
        # Mock service to raise exception
        self.mock_recommendation_service.get_recommendations.side_effect = Exception("Service error")
        
        response = self.client.get('/recommendations/user123')
        
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertFalse(data['success'])
        self.assertEqual(data['error']['code'], 'RECOMMENDATION_ERROR')
    
    def test_track_interaction_valid_data(self):
        """Test track interaction endpoint with valid data"""
        # Mock interaction service response
        from bson import ObjectId
        mock_interaction_id = ObjectId()
        self.mock_interaction_service.track_interaction.return_value = mock_interaction_id
        
        interaction_data = {
            'userId': 'user123',
            'productId': 'product456',
            'interactionType': 'view',
            'sessionId': 'session789'
        }
        
        response = self.client.post(
            '/interactions',
            data=json.dumps(interaction_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertIn('interaction_id', data['data'])
        
        # Verify service was called with correct parameters
        self.mock_interaction_service.track_interaction.assert_called_once_with(
            user_id='user123',
            product_id='product456',
            interaction_type='view',
            session_id='session789'
        )
    
    def test_track_interaction_missing_fields(self):
        """Test track interaction endpoint with missing required fields"""
        incomplete_data = {
            'userId': 'user123',
            # Missing productId and interactionType
        }
        
        response = self.client.post(
            '/interactions',
            data=json.dumps(incomplete_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertFalse(data['success'])
        self.assertEqual(data['error']['code'], 'VALIDATION_ERROR')
        self.assertIn('Missing required field', data['error']['message'])
    
    def test_track_interaction_service_error(self):
        """Test track interaction endpoint when service raises error"""
        # Mock service to raise exception
        self.mock_interaction_service.track_interaction.side_effect = Exception("Service error")
        
        interaction_data = {
            'userId': 'user123',
            'productId': 'product456',
            'interactionType': 'view'
        }
        
        response = self.client.post(
            '/interactions',
            data=json.dumps(interaction_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertFalse(data['success'])
        self.assertEqual(data['error']['code'], 'INTERACTION_ERROR')
    
    def test_retrain_model_success(self):
        """Test retrain model endpoint with successful retraining"""
        # Mock recommendation service response
        mock_result = {
            'status': 'success',
            'models_trained': ['collaborative_filtering', 'content_based_filtering'],
            'training_duration_seconds': 45.2
        }
        self.mock_recommendation_service.retrain_models.return_value = mock_result
        
        response = self.client.post('/retrain')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['status'], 'success')
        
        # Verify service was called
        self.mock_recommendation_service.retrain_models.assert_called_once()
    
    def test_retrain_model_service_error(self):
        """Test retrain model endpoint when service raises error"""
        # Mock service to raise exception
        self.mock_recommendation_service.retrain_models.side_effect = Exception("Training error")
        
        response = self.client.post('/retrain')
        
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertFalse(data['success'])
        self.assertEqual(data['error']['code'], 'RETRAIN_ERROR')
    
    def test_not_found_endpoint(self):
        """Test 404 error handling"""
        response = self.client.get('/nonexistent-endpoint')
        
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertFalse(data['success'])
        self.assertEqual(data['error']['code'], 'NOT_FOUND')

if __name__ == '__main__':
    unittest.main()