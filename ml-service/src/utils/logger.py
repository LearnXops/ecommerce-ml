"""
Logging utilities for ML service
"""

import logging
import os
from datetime import datetime

def setup_logger(name: str) -> logging.Logger:
    """Setup logger with appropriate configuration"""
    
    # Create logger
    logger = logging.getLogger(name)
    
    # Set log level from environment or default to INFO
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    logger.setLevel(getattr(logging, log_level))
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    return logger