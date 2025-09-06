# ML Recommendation Service

A machine learning-powered recommendation service that provides personalized product recommendations using collaborative filtering and content-based filtering algorithms.

## Features

- **Collaborative Filtering**: User-based recommendations using matrix factorization and cosine similarity
- **Content-Based Filtering**: Product similarity recommendations using TF-IDF and feature analysis
- **Hybrid Recommendations**: Combines both algorithms for better accuracy
- **User Interaction Tracking**: Tracks user behavior (views, cart additions, purchases)
- **Automatic Model Retraining**: Scheduled retraining based on new interaction data
- **RESTful API**: Flask-based API with comprehensive error handling

## Architecture

### Core Components

1. **Algorithms**
   - `CollaborativeFiltering`: Implements user-based collaborative filtering with SVD
   - `ContentBasedFiltering`: Implements content-based recommendations using product features

2. **Services**
   - `RecommendationService`: Main service combining multiple algorithms
   - `InteractionService`: Handles user interaction tracking and data management

3. **API Endpoints**
   - `GET /recommendations/{user_id}`: Get personalized recommendations
   - `POST /interactions`: Track user interactions
   - `POST /retrain`: Trigger model retraining
   - `GET /health`: Health check endpoint

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the service:
```bash
python app.py
```

## Configuration

Environment variables:

- `FLASK_ENV`: Flask environment (development/production)
- `PORT`: Service port (default: 3005)
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB_NAME`: Database name
- `MODEL_DIR`: Directory for storing trained models
- `RETRAIN_INTERVAL_HOURS`: Hours between automatic retraining (default: 24)
- `MIN_NEW_INTERACTIONS`: Minimum new interactions to trigger retraining (default: 100)
- `LOG_LEVEL`: Logging level (INFO, DEBUG, etc.)

## API Usage

### Get Recommendations

```bash
curl "http://localhost:3005/recommendations/user123?limit=10"
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "productId": "product456",
      "score": 0.95,
      "algorithm": "hybrid",
      "reason": "Recommended by multiple algorithms",
      "name": "Product Name",
      "price": 99.99,
      "category": "electronics"
    }
  ],
  "user_id": "user123",
  "count": 1
}
```

### Track Interaction

```bash
curl -X POST "http://localhost:3005/interactions" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "productId": "product456",
    "interactionType": "view",
    "sessionId": "session789"
  }'
```

### Trigger Retraining

```bash
curl -X POST "http://localhost:3005/retrain"
```

## Algorithms

### Collaborative Filtering

- Uses user-item interaction matrix
- Applies SVD for dimensionality reduction
- Calculates user similarity using cosine similarity
- Recommends products liked by similar users

**Features:**
- Handles sparse data with matrix factorization
- Configurable number of components
- Minimum interaction thresholds
- Weighted interaction types (view: 1.0, cart_add: 2.0, purchase: 3.0)

### Content-Based Filtering

- Analyzes product features (name, description, category, price)
- Uses TF-IDF vectorization for text features
- Combines text, numerical, and categorical features
- Creates user profiles based on interaction history

**Features:**
- Text feature extraction with TF-IDF
- Price categorization (budget, low, medium, high, premium)
- Category-based recommendations
- User profile generation from interaction history

### Hybrid Approach

- Combines collaborative and content-based recommendations
- Weights and merges scores from both algorithms
- Provides fallback to popular products
- Enriches recommendations with product details

## Model Training

### Automatic Training

The service automatically retrains models when:
- Sufficient time has passed (configurable interval)
- Minimum number of new interactions reached
- Manual retrain endpoint is called

### Training Process

1. **Data Preparation**: Fetches interaction and product data
2. **Collaborative Training**: Builds user-item matrix and similarity calculations
3. **Content Training**: Extracts features and builds similarity matrix
4. **Model Persistence**: Saves trained models to disk
5. **Metadata Tracking**: Records training timestamps and statistics

## Testing

Run unit tests:
```bash
python -m unittest discover tests -v
```

Run integration tests:
```bash
python test_integration.py
```

Test coverage includes:
- Algorithm functionality
- Service layer logic
- API endpoint behavior
- Error handling
- Data validation

## Performance Considerations

### Scalability

- **Matrix Operations**: Uses efficient NumPy operations
- **Memory Management**: Configurable feature limits
- **Database Indexing**: Optimized queries with proper indexes
- **Model Caching**: Persists trained models to avoid retraining

### Optimization

- **Sparse Matrix Handling**: SVD for dimensionality reduction
- **Feature Selection**: Configurable TF-IDF parameters
- **Batch Processing**: Efficient aggregation pipelines
- **Lazy Loading**: Models loaded on demand

## Monitoring

### Health Checks

The `/health` endpoint provides service status and can be used for:
- Load balancer health checks
- Service discovery
- Monitoring systems

### Logging

Comprehensive logging includes:
- Request/response logging
- Algorithm performance metrics
- Training statistics
- Error tracking

### Metrics

Key metrics to monitor:
- Recommendation response times
- Model training duration
- Interaction tracking volume
- Error rates

## Integration

### Database Schema

The service expects the following MongoDB collections:

**userinteractions**:
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  productId: ObjectId,
  interactionType: String, // 'view', 'cart_add', 'purchase'
  timestamp: Date,
  sessionId: String
}
```

**products**:
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  category: String,
  price: Number,
  tags: [String],
  images: [String]
}
```

### API Gateway Integration

The service is designed to work behind an API gateway with:
- Authentication middleware
- Rate limiting
- Request/response transformation
- Load balancing

## Deployment

### Docker

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 3005

CMD ["gunicorn", "--bind", "0.0.0.0:3005", "app:app"]
```

### Environment Setup

Production considerations:
- Use environment-specific configuration
- Set up proper logging levels
- Configure model persistence storage
- Set up monitoring and alerting
- Use production WSGI server (gunicorn)

## Troubleshooting

### Common Issues

1. **Model Not Training**: Check data availability and minimum thresholds
2. **Poor Recommendations**: Verify interaction data quality and algorithm parameters
3. **Performance Issues**: Monitor memory usage and consider feature reduction
4. **Database Errors**: Check connection strings and collection schemas

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
export FLASK_ENV=development
```

## Contributing

1. Follow PEP 8 style guidelines
2. Add unit tests for new features
3. Update documentation
4. Test with sample data
5. Verify API compatibility

## License

This project is part of the ecommerce application suite.