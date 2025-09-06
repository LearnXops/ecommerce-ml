"""
Collaborative Filtering Algorithm
Implements user-based collaborative filtering for product recommendations
"""

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from typing import List, Dict, Any, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class CollaborativeFiltering:
    """User-based collaborative filtering recommendation algorithm"""
    
    def __init__(self, n_components: int = 50, min_interactions: int = 5):
        """
        Initialize collaborative filtering model
        
        Args:
            n_components: Number of components for matrix factorization
            min_interactions: Minimum interactions required for recommendations
        """
        self.n_components = n_components
        self.min_interactions = min_interactions
        self.svd_model = TruncatedSVD(n_components=n_components, random_state=42)
        self.user_item_matrix = None
        self.user_similarity_matrix = None
        self.user_index_map = {}
        self.item_index_map = {}
        self.reverse_user_map = {}
        self.reverse_item_map = {}
        self.is_trained = False
    
    def prepare_data(self, interactions: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Prepare interaction data for collaborative filtering
        
        Args:
            interactions: List of user-product interaction records
            
        Returns:
            DataFrame with user-item interaction matrix
        """
        try:
            # Convert to DataFrame
            df = pd.DataFrame(interactions)
            
            if df.empty:
                logger.warning("No interaction data available")
                return pd.DataFrame()
            
            # Create interaction scores based on interaction types
            interaction_weights = {
                'view': 1.0,
                'cart_add': 2.0,
                'purchase': 3.0
            }
            
            # Calculate weighted interaction scores
            df['score'] = 0
            for interaction_type in df['interactionTypes'].iloc[0] if not df.empty else []:
                if interaction_type in interaction_weights:
                    df.loc[df['interactionTypes'].apply(
                        lambda x: interaction_type in x
                    ), 'score'] += interaction_weights[interaction_type]
            
            # Use interaction count if no specific types
            df['score'] = df['score'].fillna(df['interactions'])
            
            # Filter users and items with minimum interactions
            user_counts = df.groupby('userId')['score'].sum()
            item_counts = df.groupby('productId')['score'].sum()
            
            valid_users = user_counts[user_counts >= self.min_interactions].index
            valid_items = item_counts[item_counts >= self.min_interactions].index
            
            df_filtered = df[
                (df['userId'].isin(valid_users)) & 
                (df['productId'].isin(valid_items))
            ]
            
            logger.info(f"Filtered data: {len(df_filtered)} interactions, "
                       f"{len(valid_users)} users, {len(valid_items)} items")
            
            return df_filtered
            
        except Exception as e:
            logger.error(f"Failed to prepare data: {str(e)}")
            raise
    
    def create_user_item_matrix(self, df: pd.DataFrame) -> np.ndarray:
        """
        Create user-item interaction matrix
        
        Args:
            df: DataFrame with interaction data
            
        Returns:
            User-item matrix as numpy array
        """
        try:
            if df.empty:
                return np.array([])
            
            # Create pivot table
            matrix_df = df.pivot_table(
                index='userId',
                columns='productId',
                values='score',
                fill_value=0
            )
            
            # Create index mappings
            self.user_index_map = {user: idx for idx, user in enumerate(matrix_df.index)}
            self.item_index_map = {item: idx for idx, item in enumerate(matrix_df.columns)}
            self.reverse_user_map = {idx: user for user, idx in self.user_index_map.items()}
            self.reverse_item_map = {idx: item for item, idx in self.item_index_map.items()}
            
            # Convert to numpy array
            matrix = matrix_df.values
            
            logger.info(f"Created user-item matrix: {matrix.shape}")
            return matrix
            
        except Exception as e:
            logger.error(f"Failed to create user-item matrix: {str(e)}")
            raise
    
    def train(self, interactions: List[Dict[str, Any]]):
        """
        Train the collaborative filtering model
        
        Args:
            interactions: List of user-product interaction records
        """
        try:
            logger.info("Training collaborative filtering model...")
            
            # Prepare data
            df = self.prepare_data(interactions)
            
            if df.empty:
                logger.warning("No data available for training")
                self.is_trained = False
                return
            
            # Create user-item matrix
            self.user_item_matrix = self.create_user_item_matrix(df)
            
            if self.user_item_matrix.size == 0:
                logger.warning("Empty user-item matrix")
                self.is_trained = False
                return
            
            # Apply matrix factorization for dimensionality reduction
            if self.user_item_matrix.shape[1] > self.n_components:
                self.svd_model.fit(self.user_item_matrix)
                reduced_matrix = self.svd_model.transform(self.user_item_matrix)
            else:
                reduced_matrix = self.user_item_matrix
            
            # Calculate user similarity matrix
            self.user_similarity_matrix = cosine_similarity(reduced_matrix)
            
            self.is_trained = True
            logger.info("Collaborative filtering model trained successfully")
            
        except Exception as e:
            logger.error(f"Failed to train model: {str(e)}")
            self.is_trained = False
            raise
    
    def get_user_recommendations(
        self, 
        user_id: str, 
        n_recommendations: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Get recommendations for a specific user
        
        Args:
            user_id: ID of the user
            n_recommendations: Number of recommendations to return
            
        Returns:
            List of (product_id, score) tuples
        """
        try:
            if not self.is_trained:
                logger.warning("Model not trained, returning empty recommendations")
                return []
            
            if user_id not in self.user_index_map:
                logger.warning(f"User {user_id} not found in training data")
                return []
            
            user_idx = self.user_index_map[user_id]
            
            # Get similar users
            user_similarities = self.user_similarity_matrix[user_idx]
            
            # Find top similar users (excluding the user themselves)
            similar_users_idx = np.argsort(user_similarities)[::-1][1:11]  # Top 10 similar users
            
            # Get user's existing interactions
            user_interactions = self.user_item_matrix[user_idx]
            interacted_items = np.where(user_interactions > 0)[0]
            
            # Calculate recommendation scores
            item_scores = np.zeros(self.user_item_matrix.shape[1])
            
            for similar_user_idx in similar_users_idx:
                similarity = user_similarities[similar_user_idx]
                if similarity > 0:  # Only consider positive similarities
                    similar_user_interactions = self.user_item_matrix[similar_user_idx]
                    item_scores += similarity * similar_user_interactions
            
            # Remove already interacted items
            item_scores[interacted_items] = 0
            
            # Get top recommendations
            top_items_idx = np.argsort(item_scores)[::-1][:n_recommendations]
            
            # Convert to product IDs and scores
            recommendations = []
            for item_idx in top_items_idx:
                if item_scores[item_idx] > 0:
                    product_id = self.reverse_item_map[item_idx]
                    score = float(item_scores[item_idx])
                    recommendations.append((product_id, score))
            
            logger.info(f"Generated {len(recommendations)} recommendations for user {user_id}")
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to get recommendations: {str(e)}")
            return []
    
    def get_similar_users(self, user_id: str, n_users: int = 5) -> List[Tuple[str, float]]:
        """
        Get similar users for a given user
        
        Args:
            user_id: ID of the user
            n_users: Number of similar users to return
            
        Returns:
            List of (user_id, similarity_score) tuples
        """
        try:
            if not self.is_trained or user_id not in self.user_index_map:
                return []
            
            user_idx = self.user_index_map[user_id]
            user_similarities = self.user_similarity_matrix[user_idx]
            
            # Get top similar users (excluding the user themselves)
            similar_users_idx = np.argsort(user_similarities)[::-1][1:n_users+1]
            
            similar_users = []
            for idx in similar_users_idx:
                similar_user_id = self.reverse_user_map[idx]
                similarity = float(user_similarities[idx])
                similar_users.append((similar_user_id, similarity))
            
            return similar_users
            
        except Exception as e:
            logger.error(f"Failed to get similar users: {str(e)}")
            return []