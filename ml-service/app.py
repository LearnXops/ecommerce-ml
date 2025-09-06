"""
ML Recommendation Service
Flask application providing personalized product recommendations
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import logging
from datetime import datetime

from src.database.connection import get_database
from src.services.recommendation_service import RecommendationService
from src.services.interaction_service import InteractionService
from src.utils.logger import setup_logger

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Setup logging
logger = setup_logger(__name__)

# Initialize services
db = get_database()
recommendation_service = RecommendationService(db)
interaction_service = InteractionService(db)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ml-recommendation-service',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/recommendations/<user_id>', methods=['GET'])
def get_recommendations(user_id):
    """Get personalized recommendations for a user"""
    try:
        limit = request.args.get('limit', 10, type=int)
        recommendations = recommendation_service.get_recommendations(user_id, limit)
        
        return jsonify({
            'success': True,
            'data': recommendations,
            'user_id': user_id,
            'count': len(recommendations)
        })
    except Exception as e:
        logger.error(f"Error getting recommendations for user {user_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': {
                'code': 'RECOMMENDATION_ERROR',
                'message': 'Failed to generate recommendations'
            }
        }), 500

@app.route('/interactions', methods=['POST'])
def track_interaction():
    """Track user interaction with products"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['userId', 'productId', 'interactionType']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': f'Missing required field: {field}'
                    }
                }), 400
        
        interaction_id = interaction_service.track_interaction(
            user_id=data['userId'],
            product_id=data['productId'],
            interaction_type=data['interactionType'],
            session_id=data.get('sessionId')
        )
        
        return jsonify({
            'success': True,
            'data': {
                'interaction_id': str(interaction_id)
            }
        })
    except Exception as e:
        logger.error(f"Error tracking interaction: {str(e)}")
        return jsonify({
            'success': False,
            'error': {
                'code': 'INTERACTION_ERROR',
                'message': 'Failed to track interaction'
            }
        }), 500

@app.route('/retrain', methods=['POST'])
def retrain_model():
    """Trigger model retraining"""
    try:
        result = recommendation_service.retrain_models()
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"Error retraining model: {str(e)}")
        return jsonify({
            'success': False,
            'error': {
                'code': 'RETRAIN_ERROR',
                'message': 'Failed to retrain models'
            }
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': {
            'code': 'NOT_FOUND',
            'message': 'Endpoint not found'
        }
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': {
            'code': 'INTERNAL_ERROR',
            'message': 'Internal server error'
        }
    }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3005))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    logger.info(f"Starting ML Recommendation Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)