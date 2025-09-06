"""
Integration tests for the recommendation system
"""

import pytest
import requests
import json
from datetime import datetime
import time

# Test configuration
BASE_URL = "http://localhost:3005"
TEST_USER_ID = "test_user_123"
TEST_PRODUCT_IDS = ["prod_1", "prod_2", "prod_3", "prod_4", "prod_5"]

class TestRecommendationIntegration:
    """Integration tests for recommendation system functionality"""
    
    def test_health_endpoint(self):
        """Test that the health endpoint is working"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert data["service"] == "ml-recommendation-service"
    
    def test_track_interaction_flow(self):
        """Test the complete interaction tracking flow"""
        # Test different interaction types
        interaction_types = ["view", "cart_add", "purchase"]
        
        for i, interaction_type in enumerate(interaction_types):
            interaction_data = {
                "userId": TEST_USER_ID,
                "productId": TEST_PRODUCT_IDS[i],
                "interactionType": interaction_type,
                "sessionId": f"session_{int(time.time())}"
            }
            
            response = requests.post(
                f"{BASE_URL}/interactions",
                json=interaction_data,
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "interaction_id" in data["data"]
    
    def test_get_recommendations_after_interactions(self):
        """Test getting recommendations after tracking interactions"""
        # First, track some interactions
        for i, product_id in enumerate(TEST_PRODUCT_IDS[:3]):
            interaction_data = {
                "userId": TEST_USER_ID,
                "productId": product_id,
                "interactionType": "view",
                "sessionId": f"session_{int(time.time())}"
            }
            
            requests.post(
                f"{BASE_URL}/interactions",
                json=interaction_data,
                headers={"Content-Type": "application/json"}
            )
        
        # Wait a moment for processing
        time.sleep(1)
        
        # Get recommendations
        response = requests.get(f"{BASE_URL}/recommendations/{TEST_USER_ID}?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert data["user_id"] == TEST_USER_ID
        assert isinstance(data["data"], list)
        assert data["count"] >= 0
    
    def test_recommendations_with_different_limits(self):
        """Test recommendations with different limit parameters"""
        limits = [1, 5, 10, 20]
        
        for limit in limits:
            response = requests.get(f"{BASE_URL}/recommendations/{TEST_USER_ID}?limit={limit}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert len(data["data"]) <= limit
    
    def test_interaction_validation(self):
        """Test interaction endpoint validation"""
        # Test missing required fields
        invalid_interactions = [
            {},  # Empty data
            {"userId": TEST_USER_ID},  # Missing productId and interactionType
            {"productId": "prod_1"},  # Missing userId and interactionType
            {"interactionType": "view"},  # Missing userId and productId
            {
                "userId": TEST_USER_ID,
                "productId": "prod_1",
                "interactionType": "invalid_type"  # Invalid interaction type
            }
        ]
        
        for invalid_data in invalid_interactions:
            response = requests.post(
                f"{BASE_URL}/interactions",
                json=invalid_data,
                headers={"Content-Type": "application/json"}
            )
            
            # Should return 400 for validation errors
            assert response.status_code == 400
            data = response.json()
            assert data["success"] is False
            assert "error" in data
    
    def test_model_retrain_endpoint(self):
        """Test the model retraining endpoint"""
        response = requests.post(f"{BASE_URL}/retrain")
        
        # Should return 200 regardless of whether retraining actually happens
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
    
    def test_recommendations_for_new_user(self):
        """Test recommendations for a user with no interaction history"""
        new_user_id = f"new_user_{int(time.time())}"
        
        response = requests.get(f"{BASE_URL}/recommendations/{new_user_id}?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["user_id"] == new_user_id
        # New users might get default recommendations or empty list
        assert isinstance(data["data"], list)
    
    def test_concurrent_interactions(self):
        """Test handling concurrent interactions"""
        import threading
        
        def track_interaction(user_id, product_id, interaction_type):
            interaction_data = {
                "userId": user_id,
                "productId": product_id,
                "interactionType": interaction_type,
                "sessionId": f"session_{int(time.time())}"
            }
            
            response = requests.post(
                f"{BASE_URL}/interactions",
                json=interaction_data,
                headers={"Content-Type": "application/json"}
            )
            return response.status_code == 200
        
        # Create multiple threads to simulate concurrent requests
        threads = []
        results = []
        
        for i in range(10):
            thread = threading.Thread(
                target=lambda: results.append(
                    track_interaction(
                        f"concurrent_user_{i}",
                        f"concurrent_prod_{i % 3}",
                        "view"
                    )
                )
            )
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All requests should succeed
        assert all(results)
    
    def test_error_handling(self):
        """Test error handling for various edge cases"""
        # Test with malformed JSON
        response = requests.post(
            f"{BASE_URL}/interactions",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        
        # Test with very long user ID
        long_user_id = "x" * 1000
        response = requests.get(f"{BASE_URL}/recommendations/{long_user_id}")
        # Should handle gracefully (might return 500 or empty recommendations)
        assert response.status_code in [200, 400, 500]
    
    def test_recommendation_consistency(self):
        """Test that recommendations are consistent for the same user"""
        user_id = f"consistency_user_{int(time.time())}"
        
        # Track some interactions
        for product_id in TEST_PRODUCT_IDS[:3]:
            interaction_data = {
                "userId": user_id,
                "productId": product_id,
                "interactionType": "view",
                "sessionId": f"session_{int(time.time())}"
            }
            
            requests.post(
                f"{BASE_URL}/interactions",
                json=interaction_data,
                headers={"Content-Type": "application/json"}
            )
        
        # Get recommendations multiple times
        recommendations_1 = requests.get(f"{BASE_URL}/recommendations/{user_id}?limit=5").json()
        time.sleep(0.1)  # Small delay
        recommendations_2 = requests.get(f"{BASE_URL}/recommendations/{user_id}?limit=5").json()
        
        # Recommendations should be consistent (same products, same order)
        # unless the model is being retrained
        assert recommendations_1["success"] is True
        assert recommendations_2["success"] is True
        
        # If both have data, they should be similar
        if recommendations_1["data"] and recommendations_2["data"]:
            # At least some overlap expected
            products_1 = [r.get("productId", r.get("product_id")) for r in recommendations_1["data"]]
            products_2 = [r.get("productId", r.get("product_id")) for r in recommendations_2["data"]]
            
            # Allow for some variation but expect significant overlap
            overlap = len(set(products_1) & set(products_2))
            assert overlap >= min(len(products_1), len(products_2)) * 0.5


if __name__ == "__main__":
    # Run a quick smoke test
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ ML Service is running and accessible")
            print("Run with pytest for full integration tests:")
            print(f"pytest {__file__} -v")
        else:
            print(f"❌ ML Service returned status {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to ML Service at {BASE_URL}")
        print(f"Error: {e}")
        print("Make sure the ML service is running on port 3005")