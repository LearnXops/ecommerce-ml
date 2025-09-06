"""
Recommendation Service
Main service that combines collaborative and content-based filtering
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging
import joblib
import os
from pymongo.database import Database

from ..algorithms.collaborative_filtering import CollaborativeFiltering
from ..algorithms.content_based_filtering import ContentBasedFiltering
from .interaction_service import InteractionService

logger = logging.getLogger(__name__)

class RecommendationService:
    """Main recommendation service combining multiple algorithms"""
    
    def __init__(self, database: Database):
        self.db = database
        self.interaction_service = InteractionService(database)
        
        # Initialize algorithms
        self.collaborative_filter = CollaborativeFiltering()
        self.content_filter = ContentBasedFiltering()
        
        # Model persistence
        self.model_dir = os.getenv('MODEL_DIR', './models')
        os.makedirs(self.model_dir, exist_ok=True)
        
        # Training configuration
        self.last_training_time = None
        self.retrain_interval_hours = int(os.getenv('RETRAIN_INTERVAL_HOURS', '24'))
        self.min_new_interactions = int(os.getenv('MIN_NEW_INTERACTIONS', '100'))
        
        # Load existing models if available
        self._load_models()
    
    def _load_models(self):
        """Load pre-trained models from disk"""
        try:
            collaborative_path = os.path.join(self.model_dir, 'collaborative_model.pkl')
            content_path = os.path.join(self.model_dir, 'content_model.pkl')
            
            if os.path.exists(collaborative_path):
                self.collaborative_filter = joblib.load(collaborative_path)
                logger.info("Loaded collaborative filtering model")
            
            if os.path.exists(content_path):
                self.content_filter = joblib.load(content_path)
                logger.info("Loaded content-based filtering model")
            
            # Load training metadata
            metadata_path = os.path.join(self.model_dir, 'training_metadata.pkl')
            if os.path.exists(metadata_path):
                metadata = joblib.load(metadata_path)
                self.last_training_time = metadata.get('last_training_time')
                logger.info(f"Last training time: {self.last_training_time}")
                
        except Exception as e:
            logger.warning(f"Failed to load models: {str(e)}")
    
    def _save_models(self):
        """Save trained models to disk"""
        try:
            collaborative_path = os.path.join(self.model_dir, 'collaborative_model.pkl')
            content_path = os.path.join(self.model_dir, 'content_model.pkl')
            
            joblib.dump(self.collaborative_filter, collaborative_path)
            joblib.dump(self.content_filter, content_path)
            
            # Save training metadata
            metadata = {
                'last_training_time': self.last_training_time,
                'retrain_interval_hours': self.retrain_interval_hours
            }
            metadata_path = os.path.join(self.model_dir, 'training_metadata.pkl')
            joblib.dump(metadata, metadata_path)
            
            logger.info("Models saved successfully")
            
        except Exception as e:
            logger.error(f"Failed to save models: {str(e)}")
    
    def _get_interaction_data(self) -> List[Dict[str, Any]]:
        """Get interaction data for training"""
        try:
            return self.interaction_service.get_user_product_matrix()
        except Exception as e:
            logger.error(f"Failed to get interaction data: {str(e)}")
            return []
    
    def _get_product_data(self) -> List[Dict[str, Any]]:
        """Get product data for training"""
        try:
            products = list(self.db.products.find({}))
            return products
        except Exception as e:
            logger.error(f"Failed to get product data: {str(e)}")
            return []
    
    def _should_retrain(self) -> bool:
        """Check if models should be retrained"""
        try:
            # Check if enough time has passed
            if self.last_training_time:
                time_since_training = datetime.utcnow() - self.last_training_time
                if time_since_training.total_seconds() < self.retrain_interval_hours * 3600:
                    return False
            
            # Check if there are enough new interactions
            if self.last_training_time:
                new_interactions = self.db.userinteractions.count_documents({
                    'timestamp': {'$gt': self.last_training_time}
                })
                if new_interactions < self.min_new_interactions:
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to check retrain condition: {str(e)}")
            return False
    
    def train_models(self, force_retrain: bool = False) -> Dict[str, Any]:
        """
        Train recommendation models
        
        Args:
            force_retrain: Force retraining regardless of conditions
            
        Returns:
            Training results and statistics
        """
        try:
            if not force_retrain and not self._should_retrain():
                logger.info("Skipping training - conditions not met")
                return {
                    'status': 'skipped',
                    'reason': 'Training conditions not met',
                    'last_training_time': self.last_training_time
                }
            
            logger.info("Starting model training...")
            start_time = datetime.utcnow()
            
            # Get training data
            interactions = self._get_interaction_data()
            products = self._get_product_data()
            
            results = {
                'status': 'success',
                'training_time': start_time,
                'interactions_count': len(interactions),
                'products_count': len(products),
                'models_trained': []
            }
            
            # Train collaborative filtering model
            if interactions:
                try:
                    self.collaborative_filter.train(interactions)
                    if self.collaborative_filter.is_trained:
                        results['models_trained'].append('collaborative_filtering')
                        logger.info("Collaborative filtering model trained")
                except Exception as e:
                    logger.error(f"Failed to train collaborative filtering: {str(e)}")
            
            # Train content-based filtering model
            if products:
                try:
                    self.content_filter.train(products)
                    if self.content_filter.is_trained:
                        results['models_trained'].append('content_based_filtering')
                        logger.info("Content-based filtering model trained")
                except Exception as e:
                    logger.error(f"Failed to train content-based filtering: {str(e)}")
            
            # Update training time and save models
            self.last_training_time = start_time
            self._save_models()
            
            training_duration = (datetime.utcnow() - start_time).total_seconds()
            results['training_duration_seconds'] = training_duration
            
            logger.info(f"Model training completed in {training_duration:.2f} seconds")
            return results
            
        except Exception as e:
            logger.error(f"Failed to train models: {str(e)}")
            return {
                'status': 'error',
                'error': str(e),
                'training_time': datetime.utcnow()
            }
    
    def retrain_models(self) -> Dict[str, Any]:
        """Force retrain all models"""
        return self.train_models(force_retrain=True)
    
    def get_recommendations(
        self, 
        user_id: str, 
        limit: int = 10,
        algorithm: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get personalized recommendations for a user
        
        Args:
            user_id: ID of the user
            limit: Maximum number of recommendations
            algorithm: Specific algorithm to use ('collaborative', 'content', or None for hybrid)
            
        Returns:
            List of recommendation objects
        """
        try:
            # Auto-train if needed
            if self._should_retrain():
                logger.info("Auto-training models before generating recommendations")
                self.train_models()
            
            recommendations = []
            
            # Get user interaction history
            user_interactions = self.interaction_service.get_user_interactions(user_id)
            
            if algorithm == 'collaborative' or algorithm is None:
                # Get collaborative filtering recommendations
                if self.collaborative_filter.is_trained:
                    collab_recs = self.collaborative_filter.get_user_recommendations(
                        user_id, limit
                    )
                    for product_id, score in collab_recs:
                        recommendations.append({
                            'productId': product_id,
                            'score': score,
                            'algorithm': 'collaborative_filtering',
                            'reason': 'Users with similar preferences also liked this'
                        })
            
            if algorithm == 'content' or algorithm is None:
                # Get content-based recommendations
                if self.content_filter.is_trained and user_interactions:
                    content_recs = self.content_filter.get_user_content_recommendations(
                        user_interactions, limit
                    )
                    for product_id, score in content_recs:
                        recommendations.append({
                            'productId': product_id,
                            'score': score,
                            'algorithm': 'content_based_filtering',
                            'reason': 'Based on products you have viewed'
                        })
            
            # Hybrid approach: combine and deduplicate recommendations
            if algorithm is None and recommendations:
                # Group by product ID and combine scores
                product_scores = {}
                for rec in recommendations:
                    product_id = rec['productId']
                    if product_id not in product_scores:
                        product_scores[product_id] = {
                            'productId': product_id,
                            'total_score': 0,
                            'algorithms': [],
                            'reasons': []
                        }
                    
                    product_scores[product_id]['total_score'] += rec['score']
                    product_scores[product_id]['algorithms'].append(rec['algorithm'])
                    product_scores[product_id]['reasons'].append(rec['reason'])
                
                # Sort by combined score and format
                sorted_products = sorted(
                    product_scores.values(),
                    key=lambda x: x['total_score'],
                    reverse=True
                )
                
                recommendations = []
                for product in sorted_products[:limit]:
                    recommendations.append({
                        'productId': product['productId'],
                        'score': product['total_score'],
                        'algorithm': 'hybrid',
                        'reason': 'Recommended by multiple algorithms',
                        'contributing_algorithms': product['algorithms']
                    })
            
            # Fallback: popular products if no personalized recommendations
            if not recommendations:
                recommendations = self._get_popular_products(limit)
            
            # Enrich with product details
            recommendations = self._enrich_recommendations(recommendations)
            
            logger.info(f"Generated {len(recommendations)} recommendations for user {user_id}")
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get recommendations: {str(e)}")
            return []
    
    def _get_popular_products(self, limit: int) -> List[Dict[str, Any]]:
        """Get popular products as fallback recommendations"""
        try:
            # Get products with most interactions
            pipeline = [
                {'$group': {
                    '_id': '$productId',
                    'interaction_count': {'$sum': 1}
                }},
                {'$sort': {'interaction_count': -1}},
                {'$limit': limit}
            ]
            
            popular_products = list(self.db.userinteractions.aggregate(pipeline))
            
            recommendations = []
            for product in popular_products:
                recommendations.append({
                    'productId': str(product['_id']),
                    'score': float(product['interaction_count']),
                    'algorithm': 'popularity',
                    'reason': 'Popular among all users'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to get popular products: {str(e)}")
            return []
    
    def _enrich_recommendations(
        self, 
        recommendations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Enrich recommendations with product details"""
        try:
            if not recommendations:
                return recommendations
            
            # Get product IDs
            product_ids = [rec['productId'] for rec in recommendations]
            
            # Fetch product details
            from bson import ObjectId
            products = {}
            for product in self.db.products.find({'_id': {'$in': [ObjectId(pid) for pid in product_ids]}}):
                products[str(product['_id'])] = {
                    'name': product.get('name', ''),
                    'price': product.get('price', 0),
                    'category': product.get('category', ''),
                    'images': product.get('images', [])
                }
            
            # Enrich recommendations
            enriched = []
            for rec in recommendations:
                product_id = rec['productId']
                if product_id in products:
                    rec.update(products[product_id])
                    enriched.append(rec)
            
            return enriched
            
        except Exception as e:
            logger.error(f"Failed to enrich recommendations: {str(e)}")
            return recommendations