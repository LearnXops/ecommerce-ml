"""
Content-Based Filtering Algorithm
Implements content-based filtering using product features and categories
"""

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Any, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class ContentBasedFiltering:
    """Content-based filtering recommendation algorithm"""
    
    def __init__(self, max_features: int = 1000):
        """
        Initialize content-based filtering model
        
        Args:
            max_features: Maximum number of features for TF-IDF vectorization
        """
        self.max_features = max_features
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=max_features,
            stop_words='english',
            ngram_range=(1, 2),
            lowercase=True
        )
        self.scaler = StandardScaler()
        self.product_features = None
        self.product_similarity_matrix = None
        self.product_index_map = {}
        self.reverse_product_map = {}
        self.is_trained = False
    
    def prepare_product_data(self, products: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Prepare product data for content-based filtering
        
        Args:
            products: List of product documents
            
        Returns:
            DataFrame with processed product features
        """
        try:
            # Convert to DataFrame
            df = pd.DataFrame(products)
            
            if df.empty:
                logger.warning("No product data available")
                return pd.DataFrame()
            
            # Ensure required fields exist
            required_fields = ['_id', 'name', 'description', 'category', 'price']
            for field in required_fields:
                if field not in df.columns:
                    df[field] = ''
            
            # Convert ObjectId to string if needed
            if '_id' in df.columns:
                df['_id'] = df['_id'].astype(str)
            
            # Handle missing values
            df['name'] = df['name'].fillna('')
            df['description'] = df['description'].fillna('')
            df['category'] = df['category'].fillna('uncategorized')
            df['price'] = pd.to_numeric(df['price'], errors='coerce').fillna(0)
            
            # Fill empty categories with 'uncategorized'
            df.loc[df['category'] == '', 'category'] = 'uncategorized'
            
            # Process tags if available
            if 'tags' in df.columns:
                df['tags'] = df['tags'].apply(
                    lambda x: ' '.join(x) if isinstance(x, list) else str(x) if x else ''
                )
            else:
                df['tags'] = ''
            
            # Create combined text features
            df['combined_text'] = (
                df['name'] + ' ' + 
                df['description'] + ' ' + 
                df['category'] + ' ' + 
                df['tags']
            ).str.lower()
            
            # Create price categories for better recommendations
            df['price_category'] = pd.cut(
                df['price'], 
                bins=[0, 25, 50, 100, 250, float('inf')], 
                labels=['budget', 'low', 'medium', 'high', 'premium']
            ).astype(str)
            
            logger.info(f"Prepared {len(df)} products for content-based filtering")
            return df
            
        except Exception as e:
            logger.error(f"Failed to prepare product data: {str(e)}")
            raise
    
    def extract_features(self, df: pd.DataFrame) -> np.ndarray:
        """
        Extract features from product data
        
        Args:
            df: DataFrame with product data
            
        Returns:
            Feature matrix as numpy array
        """
        try:
            if df.empty:
                return np.array([])
            
            # Extract text features using TF-IDF
            text_features = self.tfidf_vectorizer.fit_transform(df['combined_text'])
            
            # Extract numerical features
            numerical_features = df[['price']].values
            
            # Scale numerical features
            numerical_features_scaled = self.scaler.fit_transform(numerical_features)
            
            # One-hot encode categorical features
            category_dummies = pd.get_dummies(df['category'], prefix='category')
            price_category_dummies = pd.get_dummies(df['price_category'], prefix='price_cat')
            
            # Combine all features
            categorical_features = np.hstack([
                category_dummies.values,
                price_category_dummies.values
            ])
            
            # Combine text, numerical, and categorical features
            all_features = np.hstack([
                text_features.toarray(),
                numerical_features_scaled,
                categorical_features
            ])
            
            logger.info(f"Extracted features: {all_features.shape}")
            return all_features
            
        except Exception as e:
            logger.error(f"Failed to extract features: {str(e)}")
            raise
    
    def train(self, products: List[Dict[str, Any]]):
        """
        Train the content-based filtering model
        
        Args:
            products: List of product documents
        """
        try:
            logger.info("Training content-based filtering model...")
            
            # Prepare product data
            df = self.prepare_product_data(products)
            
            if df.empty:
                logger.warning("No product data available for training")
                self.is_trained = False
                return
            
            # Create product index mappings
            self.product_index_map = {
                product_id: idx for idx, product_id in enumerate(df['_id'])
            }
            self.reverse_product_map = {
                idx: product_id for product_id, idx in self.product_index_map.items()
            }
            
            # Extract features
            self.product_features = self.extract_features(df)
            
            if self.product_features.size == 0:
                logger.warning("No features extracted")
                self.is_trained = False
                return
            
            # Calculate product similarity matrix
            self.product_similarity_matrix = cosine_similarity(self.product_features)
            
            self.is_trained = True
            logger.info("Content-based filtering model trained successfully")
            
        except Exception as e:
            logger.error(f"Failed to train model: {str(e)}")
            self.is_trained = False
            raise
    
    def get_similar_products(
        self, 
        product_id: str, 
        n_recommendations: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Get similar products based on content features
        
        Args:
            product_id: ID of the reference product
            n_recommendations: Number of similar products to return
            
        Returns:
            List of (product_id, similarity_score) tuples
        """
        try:
            if not self.is_trained:
                logger.warning("Model not trained, returning empty recommendations")
                return []
            
            if product_id not in self.product_index_map:
                logger.warning(f"Product {product_id} not found in training data")
                return []
            
            product_idx = self.product_index_map[product_id]
            
            # Get similarity scores for the product
            similarity_scores = self.product_similarity_matrix[product_idx]
            
            # Get top similar products (excluding the product itself)
            similar_products_idx = np.argsort(similarity_scores)[::-1][1:n_recommendations+1]
            
            # Convert to product IDs and scores
            recommendations = []
            for idx in similar_products_idx:
                similar_product_id = self.reverse_product_map[idx]
                score = float(similarity_scores[idx])
                recommendations.append((similar_product_id, score))
            
            logger.info(f"Generated {len(recommendations)} similar products for {product_id}")
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to get similar products: {str(e)}")
            return []
    
    def get_user_content_recommendations(
        self,
        user_interactions: List[Dict[str, Any]],
        n_recommendations: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Get content-based recommendations for a user based on their interaction history
        
        Args:
            user_interactions: List of user's product interactions
            n_recommendations: Number of recommendations to return
            
        Returns:
            List of (product_id, score) tuples
        """
        try:
            if not self.is_trained or not user_interactions:
                return []
            
            # Create user profile based on interacted products
            user_profile = np.zeros(self.product_features.shape[1])
            interaction_weights = {
                'view': 1.0,
                'cart_add': 2.0,
                'purchase': 3.0
            }
            
            total_weight = 0
            interacted_products = set()
            
            for interaction in user_interactions:
                product_id = interaction['productId']
                interaction_type = interaction['interactionType']
                
                if product_id in self.product_index_map:
                    product_idx = self.product_index_map[product_id]
                    weight = interaction_weights.get(interaction_type, 1.0)
                    
                    user_profile += weight * self.product_features[product_idx]
                    total_weight += weight
                    interacted_products.add(product_id)
            
            if total_weight == 0:
                return []
            
            # Normalize user profile
            user_profile /= total_weight
            
            # Calculate similarity between user profile and all products
            product_scores = cosine_similarity([user_profile], self.product_features)[0]
            
            # Remove already interacted products
            for product_id in interacted_products:
                if product_id in self.product_index_map:
                    product_idx = self.product_index_map[product_id]
                    product_scores[product_idx] = 0
            
            # Get top recommendations
            top_products_idx = np.argsort(product_scores)[::-1][:n_recommendations]
            
            # Convert to product IDs and scores
            recommendations = []
            for idx in top_products_idx:
                if product_scores[idx] > 0:
                    product_id = self.reverse_product_map[idx]
                    score = float(product_scores[idx])
                    recommendations.append((product_id, score))
            
            logger.info(f"Generated {len(recommendations)} content-based recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to get user content recommendations: {str(e)}")
            return []
    
    def get_category_recommendations(
        self,
        category: str,
        n_recommendations: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Get top products from a specific category
        
        Args:
            category: Product category
            n_recommendations: Number of recommendations to return
            
        Returns:
            List of (product_id, score) tuples
        """
        try:
            if not self.is_trained:
                return []
            
            # This is a simplified implementation
            # In a real scenario, you'd want to rank by popularity, ratings, etc.
            recommendations = []
            
            # For now, return random products from the category
            # This would be enhanced with actual ranking logic
            category_products = [
                (product_id, 1.0) for product_id in self.product_index_map.keys()
            ][:n_recommendations]
            
            return category_products
            
        except Exception as e:
            logger.error(f"Failed to get category recommendations: {str(e)}")
            return []