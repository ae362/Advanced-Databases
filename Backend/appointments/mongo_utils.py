# appointments/mongo_utils.py
import os
from pymongo import MongoClient
from django.conf import settings
from bson.objectid import ObjectId
# MongoDB connection singleton
_mongo_client = None
_mongo_db = None

def get_mongodb_client():
    """
    Get MongoDB client (singleton pattern)
    """
    global _mongo_client
    
    if _mongo_client is None:
        # Get MongoDB URI from settings or environment
        mongodb_uri = getattr(settings, 'MONGODB_URI', os.environ.get('MONGODB_URI'))
        
        if not mongodb_uri:
            raise Exception("MongoDB URI not configured. Please set MONGODB_URI in settings or environment.")
        
        # Create MongoDB client with timeout settings
        _mongo_client = MongoClient(
            mongodb_uri,
            serverSelectionTimeoutMS=5000,  # 5 seconds timeout
            connectTimeoutMS=10000,         # 10 seconds connection timeout
            socketTimeoutMS=45000,          # 45 seconds socket timeout
            maxPoolSize=100                 # Maximum connection pool size
        )
        
        # Test connection
        try:
            # The ismaster command is cheap and does not require auth
            _mongo_client.admin.command('ismaster')
            print("MongoDB connection successful")
        except Exception as e:
            print(f"MongoDB connection failed: {str(e)}")
            raise
    
    return _mongo_client

def get_mongodb_database():
    """
    Get MongoDB database (singleton pattern)
    """
    global _mongo_db
    
    if _mongo_db is None:
        client = get_mongodb_client()
        
        # Get database name from settings or use default
        db_name = getattr(settings, 'MONGODB_NAME', 'hcams')
        
        _mongo_db = client[db_name]
    
    return _mongo_db

def close_mongodb_connection():
    """
    Close MongoDB connection
    """
    global _mongo_client
    
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None

def mongo_id_to_str(obj):
    """Convert MongoDB ObjectId to string"""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, ObjectId):
                obj[k] = str(v)
            elif isinstance(v, dict):
                mongo_id_to_str(v)
            elif isinstance(v, list):
                for item in v:
                    if isinstance(item, dict):
                        mongo_id_to_str(item)
    return obj