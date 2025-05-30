from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from datetime import datetime, timedelta
import os
import json
import bcrypt
import traceback
import uuid
import jwt
import pymongo
from bson.objectid import ObjectId
from .mongo_utils import get_mongodb_database, mongo_id_to_str
from .mongodb_json_encoder import MongoJSONEncoder
from .mongo_auth import authenticate_user, generate_token, get_user_from_token

# Try to import REST Framework decorators if available
try:
    from rest_framework.decorators import api_view, permission_classes
    from rest_framework.permissions import AllowAny
    REST_FRAMEWORK_AVAILABLE = True
except ImportError:
    REST_FRAMEWORK_AVAILABLE = False
    # Create dummy decorators if REST Framework is not available
    def api_view(methods):
        def decorator(func):
            return func
        return decorator
    
    def permission_classes(classes):
        def decorator(func):
            return func
        return decorator
    
    class AllowAny:
        pass

# Get MongoDB database
db = get_mongodb_database()

# CORS middleware helper function
def add_cors_headers(response):
    """Add CORS headers to response"""
    response["Access-Control-Allow-Origin"] = "*"  # Or specific origin like "http://localhost:3000"
    response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-CSRFToken"
    response["Access-Control-Allow-Credentials"] = "true"
    return response

def handle_options_request(request):
    """Handle OPTIONS request for CORS preflight"""
    response = JsonResponse({})
    response = add_cors_headers(response)
    response["Access-Control-Max-Age"] = "86400"  # 24 hours
    return response

@csrf_exempt
@api_view(['POST', 'OPTIONS'])
@permission_classes([AllowAny])
def login(request):
    """
    Endpoint for user login with role validation
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        # Log the request for debugging
        print(f"Login request received: {request.method}")
        
        # Parse request body
        try:
            data = json.loads(request.body)
            print(f"Login data received: {data}")
        except json.JSONDecodeError:
            print("Invalid JSON in request body")
            response = JsonResponse({'error': 'Invalid JSON format'}, status=400)
            return add_cors_headers(response)
        
        # Validate required fields
        required_fields = ['email', 'password']
        for field in required_fields:
            if field not in data:
                print(f"Missing required field: {field}")
                response = JsonResponse({'error': f'{field} is required'}, status=400)
                return add_cors_headers(response)
        
        # Get the requested role (optional)
        requested_role = data.get('role', None)
        print(f"Requested role: {requested_role}")
        
        # Find user by email (case-insensitive)
        email = data['email'].lower()
        user = db.users.find_one({'email': {'$regex': f'^{email}$', '$options': 'i'}})
        
        if not user:
            print(f"User not found for email: {email}")
            response = JsonResponse({'error': 'Invalid email or password'}, status=401)
            return add_cors_headers(response)
        
        print(f"User found: {user['email']}")
        
        # Verify password
        try:
            # Handle both string and bytes password hashes
            stored_password = user['password']
            if isinstance(stored_password, str):
                stored_password = stored_password.encode('utf-8')
                
            if not bcrypt.checkpw(data['password'].encode('utf-8'), stored_password):
                print("Password verification failed")
                response = JsonResponse({'error': 'Invalid email or password'}, status=401)
                return add_cors_headers(response)
        except Exception as e:
            print(f"Password verification error: {str(e)}")
            response = JsonResponse({'error': 'Authentication error'}, status=500)
            return add_cors_headers(response)
        
        # If role is specified, verify that the user has that role
        if requested_role and user.get('role') != requested_role:
            print(f"Role mismatch: User role is {user.get('role')}, requested {requested_role}")
            response = JsonResponse({'error': f'User is not registered as a {requested_role}'}, status=403)
            return add_cors_headers(response)
        
        # Update last login
        try:
            db.users.update_one(
                {'id': user['id']},
                {'$set': {'last_login': datetime.now()}}
            )
        except Exception as e:
            print(f"Failed to update last login: {str(e)}")
            # Continue anyway, this is not critical
        
        # Remove password from response
        user_response = user.copy()
        user_response.pop('password', None)
        
        # Generate token
        try:
            token = generate_token(user)
        except Exception as e:
            print(f"Token generation error: {str(e)}")
            response = JsonResponse({'error': 'Failed to generate authentication token'}, status=500)
            return add_cors_headers(response)
        
        # Prepare response data
        response_data = {
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'first_name': user.get('first_name', ''),
                'last_name': user.get('last_name', ''),
                'role': user.get('role', 'patient'),
                'phone': user.get('phone', ''),
                'birthday': user.get('birthday', ''),
                'gender': user.get('gender', ''),
                'address': user.get('address', '')
            }
        }
        
        print("Login successful")
        response = JsonResponse(response_data, status=200, encoder=MongoJSONEncoder)
        return add_cors_headers(response)
    except Exception as e:
        print(f"Login error: {str(e)}")
        print(traceback.format_exc())  # Print full traceback for debugging
        response = JsonResponse({'error': 'An error occurred during login'}, status=500)
        return add_cors_headers(response)

@csrf_exempt
@api_view(['POST', 'OPTIONS'])
@permission_classes([AllowAny])
def logout(request):
    """
    Endpoint for user logout
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        # With JWT, we don't need to do anything server-side for logout
        # The client should discard the token
        response = JsonResponse({'success': 'Successfully logged out.'})
        return add_cors_headers(response)
    except Exception as e:
        print(f"Logout error: {str(e)}")
        response = JsonResponse({'error': 'An error occurred during logout'}, status=500)
        return add_cors_headers(response)

@csrf_exempt
@api_view(['POST', 'OPTIONS'])
@permission_classes([AllowAny])
def register_patient(request):
    """
    Endpoint for patient registration with CSRF exemption for testing
    """
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        response["Access-Control-Max-Age"] = "86400"
        return response
        
    try:
        data = json.loads(request.body)
        print(f"Received registration data: {data}")
        
        # Validate required fields
        required_fields = ['email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if field not in data:
                response = JsonResponse({'error': f'{field} is required'}, status=400)
                return add_cors_headers(response)
        
        # Check if user already exists
        existing_user = db.users.find_one({'email': data['email']})
        if existing_user:
            response = JsonResponse({'error': 'User with this email already exists'}, status=400)
            return add_cors_headers(response)
        
        # Hash password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user
        user_id = str(uuid.uuid4())
        user = {
            'id': user_id,
            'email': data['email'],
            'username': data.get('username', data['email']),
            'password': hashed_password,
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'role': 'patient',
            'is_active': True,
            'is_staff': False,
            'is_superuser': False,
            'date_joined': datetime.now(),
            'last_login': None,
            'phone': data.get('phone', ''),
            'birthday': data.get('birthday', ''),
            'gender': data.get('gender', ''),
            'address': data.get('address', '')
        }
        
        db.users.insert_one(user)
        
        # Create patient profile
        patient = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'name': f"{data['first_name']} {data['last_name']}",
            'email': data['email'],
            'phone': data.get('phone', ''),
            'date_of_birth': data.get('birthday', ''),
            'gender': data.get('gender', ''),
            'address': data.get('address', ''),
            'medical_history': data.get('medical_history', ''),
            'allergies': data.get('allergies', ''),
            'medications': data.get('medications', ''),
            'created_at': datetime.now()
        }
        
        db.patients.insert_one(patient)
        
        # Remove password from response
        user_response = user.copy()
        user_response.pop('password', None)
        
        # Generate token
        token = generate_token(user)
        
        response_data = {
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'role': 'patient',
                'phone': user.get('phone', ''),
                'birthday': user.get('birthday', ''),
                'gender': user.get('gender', ''),
                'address': user.get('address', '')
            }
        }
        
        print(f"Registration successful for {data['email']}")
        response = JsonResponse(response_data, status=201)
        return add_cors_headers(response)
    except Exception as e:
        print(f"Registration error: {str(e)}")
        response = JsonResponse({'error': f'An error occurred during registration: {str(e)}'}, status=500)
        return add_cors_headers(response)

@csrf_exempt
def register_doctor(request):
    """
     Endpoint for doctor registration 
    """
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
        
    if request.method == 'POST':
        try:
            # Parse the request body
            data = json.loads(request.body)
            print(f"Received doctor registration data: {data}")
            
            # Validate required fields
            required_fields = ['email', 'password', 'first_name', 'last_name', 'specialization']
            for field in required_fields:
                if field not in data:
                    return JsonResponse({'error': f'{field} is required'}, status=400)
            
            # Check if user already exists
            from pymongo import MongoClient
            from django.conf import settings
            
            client = MongoClient(settings.MONGODB_URI)
            db = client[settings.MONGODB_NAME]
            
            existing_user = db.users.find_one({'email': data['email']})
            if existing_user:
                return JsonResponse({'error': 'User with this email already exists'}, status=400)
            
            # Hash password
            hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Create user ID
            user_id = str(uuid.uuid4())
            
            # Create user
            user = {
                'id': user_id,
                'email': data['email'],
                'username': data.get('username', data['email'].split('@')[0]),
                'password': hashed_password,
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'role': 'doctor',
                'is_active': True,
                'is_staff': False,
                'is_superuser': False,
                'date_joined': datetime.now(),
                'last_login': None,
                'phone': data.get('phone', ''),
            }
            
            db.users.insert_one(user)
            
            # Create doctor profile
            doctor = {
                'id': str(uuid.uuid4()),
                'user_id': user_id,
                'name': f"{data['first_name']} {data['last_name']}",
                'email': data['email'],
                'phone': data.get('phone', ''),
                'specialization': data['specialization'],
                'qualification': data.get('qualification', ''),
                'experience_years': data.get('experience_years', 0),
                'consultation_fee': data.get('consultation_fee', '20.00'),
                'available_days': data.get('available_days', ''),
                'bio': data.get('bio', ''),
                'created_at': datetime.now()
            }
            
            db.doctors.insert_one(doctor)
            
            # Generate token for the user
            import jwt
            
            # FIX: Use timedelta correctly
            payload = {
                'user_id': user_id,
                'email': data['email'],
                'role': 'doctor',
                'exp': datetime.now() + timedelta(days=1)  # Fixed: Use timedelta, not datetime.timedelta
            }
            
            secret_key = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
            token = jwt.encode(payload, secret_key, algorithm='HS256')
            
            # Return success response
            response_data = {
                'success': True,
                'message': 'Doctor registered successfully',
                'token': token,
                'user': {
                    'id': user_id,
                    'email': data['email'],
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': 'doctor'
                }
            }
            
            return JsonResponse(response_data, status=201)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            print(f"Doctor registration error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def user_profile(request):
    """
    Endpoint for user profile management
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        # Get user ID from token
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
            response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
            return add_cors_headers(response)
        
        token = auth_header.split(' ')[1]
        user = get_user_from_token(token)
        
        if not user:
            response = JsonResponse({'error': 'Invalid token'}, status=401)
            return add_cors_headers(response)
        
        if request.method == 'GET':
            # Remove password from response
            user.pop('password', None)
            response = JsonResponse(user, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        elif request.method == 'PATCH':
            # Update user
            data = json.loads(request.body)
            
            # Don't allow updating certain fields
            protected_fields = ['id', 'email', 'password', 'role', 'is_active', 'is_staff', 'is_superuser']
            update_data = {k: v for k, v in data.items() if k not in protected_fields}
            
            db.users.update_one(
                {'id': user['id']},
                {'$set': update_data}
            )
            
            # Get updated user
            updated_user = db.users.find_one({'id': user['id']})
            updated_user.pop('password', None)
            
            response = JsonResponse(updated_user, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        else:
            response = JsonResponse({'error': 'Method not allowed'}, status=405)
            return add_cors_headers(response)
    except Exception as e:
        print(f"User profile error: {str(e)}")
        response = JsonResponse({'error': 'An error occurred while processing your request'}, status=500)
        return add_cors_headers(response)

@csrf_exempt
def avatar_upload(request):
    """
    Endpoint for avatar upload
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        if request.method != 'POST':
            response = JsonResponse({'error': 'Method not allowed'}, status=405)
            return add_cors_headers(response)
            
        # Get user ID from token
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
            response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
            return add_cors_headers(response)
        
        token = auth_header.split(' ')[1]
        user = get_user_from_token(token)
        
        if not user:
            response = JsonResponse({'error': 'Invalid token'}, status=401)
            return add_cors_headers(response)
        
        if 'avatar' not in request.FILES:
            response = JsonResponse({'error': 'No avatar file provided'}, status=400)
            return add_cors_headers(response)
        
        file = request.FILES['avatar']
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif']
        if file.content_type not in allowed_types:
            response = JsonResponse(
                {'error': 'Unsupported file type. Please upload JPEG, PNG, or GIF'},
                status=400
            )
            return add_cors_headers(response)

        # Delete old avatar if it exists
        if 'avatar' in user and user['avatar']:
            try:
                old_path = user['avatar']
                if os.path.isfile(old_path):
                    os.remove(old_path)
            except:
                pass

        # Save new avatar
        filename = f'avatars/user_{user["id"]}_{file.name}'
        
        # Save the file using default storage
        default_storage.save(filename, ContentFile(file.read()))
        
        # Update user in database
        db.users.update_one(
            {'id': user['id']},
            {'$set': {'avatar': filename}}
        )
        
        # Get updated user
        updated_user = db.users.find_one({'id': user['id']})
        updated_user.pop('password', None)
        
        response = JsonResponse(updated_user, encoder=MongoJSONEncoder)
        return add_cors_headers(response)
    except Exception as e:
        print(f"Avatar upload error: {str(e)}")
        response = JsonResponse({'error': f'Failed to upload avatar: {str(e)}'}, status=500)
        return add_cors_headers(response)

@csrf_exempt
def users(request, id=None):
    """
    Endpoint for user management
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        # Check if user is authorized
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
            response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
            return add_cors_headers(response)
        
        token = auth_header.split(' ')[1]
        current_user = get_user_from_token(token)
        
        if not current_user:
            response = JsonResponse({'error': 'Invalid token'}, status=401)
            return add_cors_headers(response)
        
        # LIST
        if request.method == 'GET' and id is None:
            # Check if user is admin
            if current_user.get('role') != 'admin':
                response = JsonResponse({'error': 'Admin privileges required'}, status=403)
                return add_cors_headers(response)
            
            # Get all users
            users = list(db.users.find())
            
            # Remove passwords
            for user in users:
                user.pop('password', None)
            
            response = JsonResponse(users, safe=False, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # RETRIEVE
        elif request.method == 'GET' and id is not None:
            # Check if user is admin or the requested user
            if current_user.get('role') != 'admin' and current_user['id'] != id:
                response = JsonResponse({'error': 'You do not have permission to view this user'}, status=403)
                return add_cors_headers(response)
            
            # Get user
            user = db.users.find_one({'id': id})
            if not user:
                response = JsonResponse({'error': 'User not found'}, status=404)
                return add_cors_headers(response)
            
            # Remove password
            user.pop('password', None)
            
            response = JsonResponse(user, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # CREATE
        elif request.method == 'POST' and id is None:
            # Check if user is admin
            if current_user.get('role') != 'admin':
                response = JsonResponse({'error': 'Admin privileges required'}, status=403)
                return add_cors_headers(response)
            
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ['email', 'password', 'first_name', 'last_name', 'role']
            for field in required_fields:
                if field not in data:
                    response = JsonResponse({'error': f'{field} is required'}, status=400)
                    return add_cors_headers(response)
            
            # Check if user already exists
            existing_user = db.users.find_one({'email': data['email']})
            if existing_user:
                response = JsonResponse({'error': 'User with this email already exists'}, status=400)
                return add_cors_headers(response)
            
            # Hash password
            hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Create user
            user_id = str(uuid.uuid4())
            user = {
                'id': user_id,
                'email': data['email'],
                'username': data.get('username', data['email']),
                'password': hashed_password,
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'role': data['role'],
                'is_active': True,
                'is_staff': data['role'] in ['admin', 'doctor'],
                'is_superuser': data['role'] == 'admin',
                'date_joined': datetime.now(),
                'last_login': None
            }
            
            db.users.insert_one(user)
            
            # Remove password from response
            user.pop('password', None)
            
            response = JsonResponse(user, status=201, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # UPDATE
        elif request.method in ['PUT', 'PATCH'] and id is not None:
            # Check if user is admin or the requested user
            if current_user.get('role') != 'admin' and current_user['id'] != id:
                response = JsonResponse({'error': 'You do not have permission to update this user'}, status=403)
                return add_cors_headers(response)
            
            # Get user
            user = db.users.find_one({'id': id})
            if not user:
                response = JsonResponse({'error': 'User not found'}, status=404)
                return add_cors_headers(response)
            
            data = json.loads(request.body)
            
            # Don't allow updating certain fields unless admin
            protected_fields = ['id', 'email', 'role', 'is_active', 'is_staff', 'is_superuser']
            if current_user.get('role') != 'admin':
                update_data = {k: v for k, v in data.items() if k not in protected_fields}
            else:
                update_data = data
            
            # Handle password update separately
            if 'password' in update_data:
                update_data['password'] = bcrypt.hashpw(update_data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Update user
            db.users.update_one(
                {'id': id},
                {'$set': update_data}
            )
            
            # Get updated user
            updated_user = db.users.find_one({'id': id})
            updated_user.pop('password', None)
            
            response = JsonResponse(updated_user, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # DELETE
        elif request.method == 'DELETE' and id is not None:
            # Check if user is admin
            if current_user.get('role') != 'admin':
                response = JsonResponse({'error': 'Admin privileges required'}, status=403)
                return add_cors_headers(response)
            
            # Get user
            user = db.users.find_one({'id': id})
            if not user:
                response = JsonResponse({'error': 'User not found'}, status=404)
                return add_cors_headers(response)
            
            # Delete user
            db.users.delete_one({'id': id})
            
            # Delete related data
            if user.get('role') == 'patient':
                db.patients.delete_many({'user_id': id})
            elif user.get('role') == 'doctor':
                db.doctors.delete_many({'user_id': id})
            
            response = JsonResponse({'message': 'User deleted successfully'})
            return add_cors_headers(response)
        
        else:
            response = JsonResponse({'error': 'Method not allowed'}, status=405)
            return add_cors_headers(response)
    except Exception as e:
        print(f"Users endpoint error: {str(e)}")
        response = JsonResponse({'error': 'An error occurred while processing your request'}, status=500)
        return add_cors_headers(response)

@csrf_exempt
def new_user_form(request):
    """
    Get form fields for creating a new user
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        # Check if user is admin
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
            response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
            return add_cors_headers(response)
        
        token = auth_header.split(' ')[1]
        current_user = get_user_from_token(token)
        
        if not current_user or current_user.get('role') != 'admin':
            response = JsonResponse({'error': 'Admin privileges required'}, status=403)
            return add_cors_headers(response)
        
        form_data = {
            "message": "Ready to create new user",
            "fields": [
                {"name": "email", "type": "email", "required": True},
                {"name": "password", "type": "password", "required": True},
                {"name": "first_name", "type": "string", "required": True},
                {"name": "last_name", "type": "string", "required": True},
                {"name": "role", "type": "select", "required": True, "options": ["admin", "doctor", "patient"]},
                {"name": "phone", "type": "string", "required": False},
                {"name": "birthday", "type": "date", "required": False},
                {"name": "gender", "type": "select", "required": False, "options": ["male", "female", "other", "prefer-not-to-say"]},
                {"name": "address", "type": "string", "required": False}
            ]
        }
        
        response = JsonResponse(form_data)
        return add_cors_headers(response)
    except Exception as e:
        print(f"New user form error: {str(e)}")
        response = JsonResponse({'error': 'An error occurred while processing your request'}, status=500)
        return add_cors_headers(response)

@csrf_exempt
def doctors(request, id=None):
    """
    Endpoint for doctor management
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        # LIST
        if request.method == 'GET' and id is None:
            doctors_list = list(db.doctors.find())
            response = JsonResponse(doctors_list, safe=False, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # RETRIEVE
        elif request.method == 'GET' and id is not None:
            doctor = db.doctors.find_one({'id': id})
            if not doctor:
                response = JsonResponse({'error': 'Doctor not found'}, status=404)
                return add_cors_headers(response)
            
            response = JsonResponse(doctor, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # For other methods, check authentication
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
            response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
            return add_cors_headers(response)
        
        token = auth_header.split(' ')[1]
        user = get_user_from_token(token)
        
        if not user:
            response = JsonResponse({'error': 'Invalid token'}, status=401)
            return add_cors_headers(response)
        
        # CREATE
        if request.method == 'POST' and id is None:
            # Check if user is admin
            if user.get('role') != 'admin':
                response = JsonResponse({'error': 'Admin privileges required'}, status=403)
                return add_cors_headers(response)
            
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ['name', 'specialization', 'email', 'phone']
            for field in required_fields:
                if field not in data:
                    response = JsonResponse({'error': f'{field} is required'}, status=400)
                    return add_cors_headers(response)
            
            # Check if doctor already exists
            existing_doctor = db.doctors.find_one({'email': data['email']})
            if existing_doctor:
                response = JsonResponse({'error': 'Doctor with this email already exists'}, status=400)
                return add_cors_headers(response)
            
            # Create doctor
            doctor_id = str(uuid.uuid4())
            doctor = {
                'id': doctor_id,
                'name': data['name'],
                'specialization': data['specialization'],
                'email': data['email'],
                'phone': data['phone'],
                'qualification': data.get('qualification', ''),
                'experience_years': data.get('experience_years', 0),
                'consultation_fee': data.get('consultation_fee', ''),
                'available_days': data.get('available_days', ''),
                'bio': data.get('bio', ''),
                'medical_center': data.get('medical_center', None),
                'medical_center_name': data.get('medical_center_name', ''),
                'emergency_available': data.get('emergency_available', False),
                'daily_patient_limit': data.get('daily_patient_limit', 0),
                'is_available': data.get('is_available', True),
                'created_at': datetime.now()
            }
            
            db.doctors.insert_one(doctor)
            
            response = JsonResponse(doctor, status=201, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # UPDATE
        elif request.method in ['PUT', 'PATCH'] and id is not None:
            # Check if user is admin
            if user.get('role') != 'admin':
                response = JsonResponse({'error': 'Admin privileges required'}, status=403)
                return add_cors_headers(response)
            
            doctor = db.doctors.find_one({'id': id})
            if not doctor:
                response = JsonResponse({'error': 'Doctor not found'}, status=404)
                return add_cors_headers(response)
            
            data = json.loads(request.body)
            
            # Update doctor
            db.doctors.update_one(
                {'id': id},
                {'$set': data}
            )
            
            # Get updated doctor
            updated_doctor = db.doctors.find_one({'id': id})
            
            response = JsonResponse(updated_doctor, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # DELETE
        elif request.method == 'DELETE' and id is not None:
            # Check if user is admin
            if user.get('role') != 'admin':
                response = JsonResponse({'error': 'Admin privileges required'}, status=403)
                return add_cors_headers(response)
            
            doctor = db.doctors.find_one({'id': id})
            if not doctor:
                response = JsonResponse({'error': 'Doctor not found'}, status=404)
                return add_cors_headers(response)
            
            # Delete doctor
            db.doctors.delete_one({'id': id})
            
            response = JsonResponse({'message': 'Doctor deleted successfully'})
            return add_cors_headers(response)
        
        else:
            response = JsonResponse({'error': 'Method not allowed'}, status=405)
            return add_cors_headers(response)
    except Exception as e:
        print(f"Doctors endpoint error: {str(e)}")
        response = JsonResponse({'error': 'An error occurred while processing your request'}, status=500)
        return add_cors_headers(response)

@csrf_exempt
def doctor_availability(request, doctor_id=None, availability_id=None):
    """
    Endpoint for doctor availability management
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        # Check if doctor exists
        if doctor_id:
            doctor = db.doctors.find_one({'id': doctor_id})
            if not doctor:
                response = JsonResponse({'error': 'Doctor not found'}, status=404)
                return add_cors_headers(response)
        
        # GET - retrieve availability
        if request.method == 'GET':
            if doctor_id:
                # Get doctor's available days
                available_days = doctor.get('available_days', '')
                
                # Get doctor's exceptions (days off)
                exceptions = list(db.doctor_exceptions.find({'doctor_id': doctor_id}))
                
                # Get doctor's appointments
                appointments = list(db.appointments.find({'doctor': doctor_id, 'status': 'scheduled'}))
                
                # Format response
                availability_data = {
                    'doctor_id': doctor_id,
                    'doctor_name': doctor['name'],
                    'available_days': available_days,
                    'exceptions': exceptions,
                    'appointments': appointments
                }
                
                response = JsonResponse(availability_data, encoder=MongoJSONEncoder)
                return add_cors_headers(response)
            else:
                # Get all doctors
                doctors = list(db.doctors.find())
                
                # Format response
                response_data = []
                
                for doctor in doctors:
                    # Get doctor's exceptions (days off)
                    exceptions = list(db.doctor_exceptions.find({'doctor_id': doctor['id']}))
                    
                    # Get doctor's appointments
                    appointments = list(db.appointments.find({'doctor': doctor['id'], 'status': 'scheduled'}))
                    
                    # Format doctor data
                    doctor_data = {
                        'doctor_id': doctor['id'],
                        'doctor_name': doctor['name'],
                        'available_days': doctor.get('available_days', ''),
                        'exceptions': exceptions,
                        'appointments': appointments
                    }
                    
                    response_data.append(doctor_data)
                
                response = JsonResponse(response_data, safe=False, encoder=MongoJSONEncoder)
                return add_cors_headers(response)
        
        # For other methods, check authentication
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
            response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
            return add_cors_headers(response)
        
        token = auth_header.split(' ')[1]
        user = get_user_from_token(token)
        
        if not user:
            response = JsonResponse({'error': 'Invalid token'}, status=401)
            return add_cors_headers(response)
        
        # Check if user is admin or the doctor
        is_admin = user.get('role') == 'admin'
        is_doctor = False
        
        if user.get('role') == 'doctor':
            doctor_user = db.doctors.find_one({'user_id': user['id']})
            if doctor_user and doctor_user['id'] == doctor_id:
                is_doctor = True
        
        if not (is_admin or is_doctor):
            response = JsonResponse({'error': 'Unauthorized'}, status=403)
            return add_cors_headers(response)
        
        # POST - set availability
        if request.method == 'POST':
            data = json.loads(request.body)
            
            # Update available days
            if 'available_days' in data:
                db.doctors.update_one(
                    {'id': doctor_id},
                    {'$set': {'available_days': data['available_days']}}
                )
            
            # Get updated doctor
            updated_doctor = db.doctors.find_one({'id': doctor_id})
            
            response = JsonResponse(updated_doctor, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        else:
            response = JsonResponse({'error': 'Method not allowed'}, status=405)
            return add_cors_headers(response)
    except Exception as e:
        print(f"Doctor availability error: {str(e)}")
        response = JsonResponse({'error': 'An error occurred while processing your request'}, status=500)
        return add_cors_headers(response)

@csrf_exempt
def patients(request, id=None):
    """
    Endpoint for patient management
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        # Check if user is authorized
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
            response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
            return add_cors_headers(response)
        
        token = auth_header.split(' ')[1]
        user = get_user_from_token(token)
        
        if not user:
            response = JsonResponse({'error': 'Invalid token'}, status=401)
            return add_cors_headers(response)
        
        # LIST
        if request.method == 'GET' and id is None:
            # Check if user is admin or doctor
            if user.get('role') not in ['admin', 'doctor']:
                response = JsonResponse({'error': 'Admin or doctor privileges required'}, status=403)
                return add_cors_headers(response)
            
            # Get all patients
            patients = list(db.patients.find())
            
            response = JsonResponse(patients, safe=False, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # RETRIEVE
        elif request.method == 'GET' and id is not None:
            # Get patient
            patient = db.patients.find_one({'id': id})
            if not patient:
                response = JsonResponse({'error': 'Patient not found'}, status=404)
                return add_cors_headers(response)
            
            # Check if user has permission to view this patient
            if user.get('role') not in ['admin', 'doctor'] and user['id'] != patient['user_id']:
                response = JsonResponse({'error': 'You do not have permission to view this patient'}, status=403)
                return add_cors_headers(response)
            
            response = JsonResponse(patient, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # CREATE
        elif request.method == 'POST' and id is None:
            # Check if user is admin
            if user.get('role') != 'admin':
                response = JsonResponse({'error': 'Admin privileges required'}, status=403)
                return add_cors_headers(response)
            
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ['name', 'email']
            for field in required_fields:
                if field not in data:
                    response = JsonResponse({'error': f'{field} is required'}, status=400)
                    return add_cors_headers(response)
            
            # Check if patient already exists
            existing_patient = db.patients.find_one({'email': data['email']})
            if existing_patient:
                response = JsonResponse({'error': 'Patient with this email already exists'}, status=400)
                return add_cors_headers(response)
            
            # Create patient
            patient_id = str(uuid.uuid4())
            patient = {
                'id': patient_id,
                'name': data['name'],
                'email': data['email'],
                'phone': data.get('phone', ''),
                'date_of_birth': data.get('date_of_birth', ''),
                'gender': data.get('gender', ''),
                'address': data.get('address', ''),
                'medical_history': data.get('medical_history', ''),
                'allergies': data.get('allergies', ''),
                'medications': data.get('medications', ''),
                'created_at': datetime.now()
            }
            
            db.patients.insert_one(patient)
            
            response = JsonResponse(patient, status=201, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # UPDATE
        elif request.method in ['PUT', 'PATCH'] and id is not None:
            # Get patient
            patient = db.patients.find_one({'id': id})
            if not patient:
                response = JsonResponse({'error': 'Patient not found'}, status=404)
                return add_cors_headers(response)
            
            # Check if user has permission to update this patient
            if user.get('role') != 'admin' and user['id'] != patient['user_id']:
                response = JsonResponse({'error': 'You do not have permission to update this patient'}, status=403)
                return add_cors_headers(response)
            
            data = json.loads(request.body)
            
            # Update patient
            db.patients.update_one(
                {'id': id},
                {'$set': data}
            )
            
            # Get updated patient
            updated_patient = db.patients.find_one({'id': id})
            
            response = JsonResponse(updated_patient, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # DELETE
        elif request.method == 'DELETE' and id is not None:
            # Check if user is admin
            if user.get('role') != 'admin':
                response = JsonResponse({'error': 'Admin privileges required'}, status=403)
                return add_cors_headers(response)
            
            patient = db.patients.find_one({'id': id})
            if not patient:
                response = JsonResponse({'error': 'Patient not found'}, status=404)
                return add_cors_headers(response)
            
            # Delete patient
            db.patients.delete_one({'id': id})
            
            response = JsonResponse({'message': 'Patient deleted successfully'})
            return add_cors_headers(response)
        
        else:
            response = JsonResponse({'error': 'Method not allowed'}, status=405)
            return add_cors_headers(response)
    except Exception as e:
        print(f"Patients endpoint error: {str(e)}")
        response = JsonResponse({'error': 'An error occurred while processing your request'}, status=500)
        return add_cors_headers(response)

@csrf_exempt
def appointments(request, id=None):
    """
    Endpoint for appointment management
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        # Check if user is authorized
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header:
            response = JsonResponse({'error': 'No authorization header provided'}, status=401)
            return add_cors_headers(response)
            
        # Extract the token - handle both Token and Bearer formats
        if auth_header.startswith('Token '):
            token = auth_header.split(' ')[1]
        elif auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        else:
            response = JsonResponse({'error': 'Invalid authorization format'}, status=401)
            return add_cors_headers(response)
        
        user = get_user_from_token(token)
        
        if not user:
            response = JsonResponse({'error': 'Invalid token'}, status=401)
            return add_cors_headers(response)
        
        # LIST
        if request.method == 'GET' and id is None:
            # Check if this is an admin user requesting all appointments
            is_admin_request = user.get('role') == 'admin' and request.GET.get('admin') == 'true'
            
            # Check if filtering by doctor
            doctor_id = request.GET.get('doctor')
            
            if is_admin_request:
                # Admin users can see all appointments
                if doctor_id:
                    appointments = list(db.appointments.find({'doctor': doctor_id}).sort('date', -1))
                else:
                    appointments = list(db.appointments.find().sort('date', -1))
            else:
                # Regular users only see their own appointments
                if user.get('role') == 'doctor':
                    doctor = db.doctors.find_one({'user_id': user['id']})
                    if doctor:
                        appointments = list(db.appointments.find({'doctor': doctor['id']}).sort('date', -1))
                    else:
                        appointments = []
                else:
                    appointments = list(db.appointments.find({'patient': user['id']}).sort('date', -1))
            
            # Convert MongoDB ObjectId to string
            for appointment in appointments:
                if '_id' in appointment:
                    appointment['_id'] = str(appointment['_id'])
            
            response = JsonResponse(appointments, safe=False, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # RETRIEVE
        elif request.method == 'GET' and id is not None:
            # Get appointment
            appointment = db.appointments.find_one({'id': id})
            if not appointment:
                response = JsonResponse({'error': 'Appointment not found'}, status=404)
                return add_cors_headers(response)
            
            # Check if user has permission to view this appointment
            if user.get('role') != 'admin' and user['id'] != appointment['patient'] and user['id'] != appointment['doctor']:
                response = JsonResponse({'error': 'You do not have permission to view this appointment'}, status=403)
                return add_cors_headers(response)
            
            response = JsonResponse(appointment, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # CREATE
        elif request.method == 'POST' and id is None:
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ['doctor', 'date']
            for field in required_fields:
                if field not in data:
                    response = JsonResponse({'error': f'{field} is required'}, status=400)
                    return add_cors_headers(response)
            
            # Get doctor
            doctor = db.doctors.find_one({'id': data['doctor']})
            if not doctor:
                response = JsonResponse({'error': 'Doctor not found'}, status=404)
                return add_cors_headers(response)
            
            # Parse date
            try:
                appointment_date = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
            except:
                response = JsonResponse({'error': 'Invalid date format'}, status=400)
                return add_cors_headers(response)
            
            # Check for conflicts
            existing = db.appointments.find_one({
                'doctor': doctor['id'],
                'date': appointment_date,
                'status': 'scheduled'
            })
            
            if existing:
                response = JsonResponse({'error': 'This time slot is already booked'}, status=400)
                return add_cors_headers(response)
            
            # Create appointment
            appointment_id = str(uuid.uuid4())
            appointment = {
                'id': appointment_id,
                'patient': user['id'],
                'patient_name': f"{user['first_name']} {user['last_name']}",
                'doctor': doctor['id'],
                'doctor_name': doctor['name'],
                'date': appointment_date,
                'notes': data.get('notes', ''),
                'status': 'scheduled',
                'blood_type': data.get('blood_type', ''),
                'medications': data.get('medications', ''),
                'allergies': data.get('allergies', ''),
                'medical_conditions': data.get('medical_conditions', ''),
                'reason_for_visit': data.get('reason_for_visit', ''),
                'created_at': datetime.now()
            }
            
            db.appointments.insert_one(appointment)
            
            response = JsonResponse(appointment, status=201, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # UPDATE
        elif request.method in ['PUT', 'PATCH'] and id is not None:
            # Get appointment
            appointment = db.appointments.find_one({'id': id})
            if not appointment:
                response = JsonResponse({'error': 'Appointment not found'}, status=404)
                return add_cors_headers(response)
            
            # Check if user has permission to update this appointment
            if user.get('role') != 'admin' and user['id'] != appointment['patient'] and user['id'] != appointment['doctor']:
                response = JsonResponse({'error': 'You do not have permission to update this appointment'}, status=403)
                return add_cors_headers(response)
            
            data = json.loads(request.body)
            
            # Update appointment
            db.appointments.update_one(
                {'id': id},
                {'$set': data}
            )
            
            # Get updated appointment
            updated_appointment = db.appointments.find_one({'id': id})
            
            response = JsonResponse(updated_appointment, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # DELETE
        elif request.method == 'DELETE' and id is not None:
            # Get appointment
            appointment = db.appointments.find_one({'id': id})
            if not appointment:
                response = JsonResponse({'error': 'Appointment not found'}, status=404)
                return add_cors_headers(response)
            
            # Check if user has permission to delete this appointment
            if user.get('role') != 'admin' and user['id'] != appointment['patient']:
                response = JsonResponse({'error': 'You do not have permission to delete this appointment'}, status=403)
                return add_cors_headers(response)
            
            # Delete appointment
            db.appointments.delete_one({'id': id})
            
            response = JsonResponse({'message': 'Appointment deleted successfully'})
            return add_cors_headers(response)
        
        else:
            response = JsonResponse({'error': 'Method not allowed'}, status=405)
            return add_cors_headers(response)
    except Exception as e:
        print(f"Appointments endpoint error: {str(e)}")
        response = JsonResponse({'error': 'An error occurred while processing your request'}, status=500)
        return add_cors_headers(response)

@csrf_exempt
def new_appointment_form(request):
    """
    Get form fields for creating a new appointment
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        # Get all doctors for the dropdown
        doctors = list(db.doctors.find())
        
        form_data = {
            "message": "Ready to create new appointment",
            "fields": [
                {"name": "doctor", "type": "select", "required": True},
                {"name": "date", "type": "date", "required": True},
                {"name": "time", "type": "time", "required": True},
                {"name": "blood_type", "type": "select", "required": False},
                {"name": "medications", "type": "text", "required": False},
                {"name": "allergies", "type": "text", "required": False},
                {"name": "medical_conditions", "type": "text", "required": False},
                {"name": "reason_for_visit", "type": "text", "required": False},
                {"name": "notes", "type": "text", "required": False}
            ],
            "doctors": doctors,
        }
        
        response = JsonResponse(form_data, encoder=MongoJSONEncoder)
        return add_cors_headers(response)
    except Exception as e:
        print(f"New appointment form error: {str(e)}")
        response = JsonResponse({'error': 'An error occurred while processing your request'}, status=500)
        return add_cors_headers(response)


@csrf_exempt
def update_appointment_status(request, appointment_id):
    """
    Special endpoint to allow doctors to update the status of their own appointments.
    This bypasses the normal permission checks.
    """
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "PATCH, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
        
    if request.method == 'PATCH':
        try:
            # Get the token from the Authorization header
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            
            if not auth_header or not auth_header.startswith('Token '):
                return JsonResponse({"error": "Authentication required"}, status=401)
            
            token = auth_header.split(' ')[1]
            
            # Decode the token to get the user ID
            try:
                secret_key = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
                payload = jwt.decode(token, secret_key, algorithms=['HS256'])
                user_id = payload.get('user_id')
                
                if not user_id:
                    return JsonResponse({"error": "Invalid token"}, status=401)
            except jwt.ExpiredSignatureError:
                return JsonResponse({"error": "Token expired"}, status=401)
            except jwt.InvalidTokenError:
                return JsonResponse({"error": "Invalid token"}, status=401)
            
            # Parse the request body
            data = json.loads(request.body)
            status_value = data.get('status')
            
            if not status_value:
                return JsonResponse({"error": "Status field is required"}, status=400)
            
            # Get the appointment from MongoDB
            # Try different ID formats (string ID or ObjectId)
            appointment = None
            try:
                # Try with the ID as is
                appointment = db.appointments.find_one({"id": appointment_id})
                
                # If not found, try with ObjectId
                if not appointment and ObjectId.is_valid(appointment_id):
                    appointment = db.appointments.find_one({"_id": ObjectId(appointment_id)})
            except Exception as e:
                print(f"Error finding appointment: {str(e)}")
            
            if not appointment:
                return JsonResponse({"error": "Appointment not found"}, status=404)
            
            # Get the doctor associated with this user
            doctor = db.doctors.find_one({"user_id": user_id})
            
            if not doctor:
                return JsonResponse({"error": "Doctor not found for this user"}, status=403)
            
            # Check if the doctor is assigned to this appointment
            doctor_id = doctor.get('id')
            appointment_doctor_id = appointment.get('doctor')
            
            # Convert to string for comparison if needed
            if appointment_doctor_id and str(appointment_doctor_id) != str(doctor_id):
                # Also check if the user is an admin
                user = db.users.find_one({"id": user_id})
                is_admin = user and (user.get('is_staff') or user.get('is_superuser') or user.get('role') == 'admin')
                
                if not is_admin:
                    return JsonResponse(
                        {"error": "You do not have permission to update this appointment"}, 
                        status=403
                    )
            
            # Update the appointment status
            result = db.appointments.update_one(
                {"id": appointment_id} if appointment.get('id') else {"_id": appointment["_id"]},
                {"$set": {"status": status_value}}
            )
            
            if result.modified_count == 0:
                return JsonResponse({"error": "Failed to update appointment"}, status=500)
            
            # Get the updated appointment
            updated_appointment = db.appointments.find_one(
                {"id": appointment_id} if appointment.get('id') else {"_id": appointment["_id"]}
            )
            
            # Convert ObjectId to string for JSON serialization
            if updated_appointment and "_id" in updated_appointment:
                updated_appointment["_id"] = str(updated_appointment["_id"])
            
            return JsonResponse(updated_appointment or {})
            
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        except Exception as e:
            print(f"Error updating appointment: {str(e)}")
            return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def doctor_exceptions(request, doctor_id=None, exception_id=None):
    """
    Endpoint for managing doctor exceptions (days off)
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        # LIST all exceptions (admin only)
        if request.method == 'GET' and doctor_id is None and exception_id is None:
            # Check if user is admin
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
                response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
                return add_cors_headers(response)
            
            token = auth_header.split(' ')[1]
            user = get_user_from_token(token)
            
            if not user or user.get('role') != 'admin':
                response = JsonResponse({'error': 'Admin privileges required'}, status=403)
                return add_cors_headers(response)
            
            # Get all exceptions
            exceptions = list(db.doctor_exceptions.find())
            
            response = JsonResponse(exceptions, safe=False, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # LIST exceptions for a specific doctor
        elif request.method == 'GET' and doctor_id is not None and exception_id is None:
            # Check if user is authorized
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
                response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
                return add_cors_headers(response)
            
            token = auth_header.split(' ')[1]
            user = get_user_from_token(token)
            
            if not user:
                response = JsonResponse({'error': 'Invalid token'}, status=401)
                return add_cors_headers(response)
            
            # Check if user is admin or the doctor
            is_admin = user.get('role') == 'admin'
            is_doctor = False
            
            if user.get('role') == 'doctor':
                doctor = db.doctors.find_one({'user_id': user['id']})
                if doctor and doctor['id'] == doctor_id:
                    is_doctor = True
            
            if not (is_admin or is_doctor):
                response = JsonResponse({'error': 'Unauthorized'}, status=403)
                return add_cors_headers(response)
            
            # Get exceptions for this doctor
            exceptions = list(db.doctor_exceptions.find({'doctor_id': doctor_id}))
            
            response = JsonResponse(exceptions, safe=False, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # RETRIEVE a specific exception
        elif request.method == 'GET' and doctor_id is not None and exception_id is not None:
            # Check if user is authorized
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
                response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
                return add_cors_headers(response)
            
            token = auth_header.split(' ')[1]
            user = get_user_from_token(token)
            
            if not user:
                response = JsonResponse({'error': 'Invalid token'}, status=401)
                return add_cors_headers(response)
            
            # Check if user is admin or the doctor
            is_admin = user.get('role') == 'admin'
            is_doctor = False
            
            if user.get('role') == 'doctor':
                doctor = db.doctors.find_one({'user_id': user['id']})
                if doctor and doctor['id'] == doctor_id:
                    is_doctor = True
            
            if not (is_admin or is_doctor):
                response = JsonResponse({'error': 'Unauthorized'}, status=403)
                return add_cors_headers(response)
            
            # Get exception
            exception = db.doctor_exceptions.find_one({'id': exception_id, 'doctor_id': doctor_id})
            
            if not exception:
                response = JsonResponse({'error': 'Exception not found'}, status=404)
                return add_cors_headers(response)
            
            response = JsonResponse(exception, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # CREATE a new exception
        elif request.method == 'POST' and doctor_id is None and exception_id is None:
            # Check if user is admin
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
                response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
                return add_cors_headers(response)
            
            token = auth_header.split(' ')[1]
            user = get_user_from_token(token)
            
            if not user or user.get('role') != 'admin':
                response = JsonResponse({'error': 'Admin privileges required'}, status=403)
                return add_cors_headers(response)
            
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ['doctor_id', 'date', 'reason']
            for field in required_fields:
                if field not in data:
                    response = JsonResponse({'error': f'{field} is required'}, status=400)
                    return add_cors_headers(response)
            
            # Check if doctor exists
            doctor = db.doctors.find_one({'id': data['doctor_id']})
            if not doctor:
                response = JsonResponse({'error': 'Doctor not found'}, status=404)
                return add_cors_headers(response)
            
            # Create exception
            exception_id = str(uuid.uuid4())
            exception = {
                'id': exception_id,
                'doctor_id': data['doctor_id'],
                'doctor_name': doctor['name'],
                'date': data['date'],
                'reason': data['reason'],
                'created_at': datetime.now(),
                'created_by': user['id']
            }
            
            db.doctor_exceptions.insert_one(exception)
            
            response = JsonResponse(exception, status=201, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # CREATE a new exception for a specific doctor
        elif request.method == 'POST' and doctor_id is not None and exception_id is None:
            # Check if user is authorized
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
                response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
                return add_cors_headers(response)
            
            token = auth_header.split(' ')[1]
            user = get_user_from_token(token)
            
            if not user:
                response = JsonResponse({'error': 'Invalid token'}, status=401)
                return add_cors_headers(response)
            
            # Check if user is admin or the doctor
            is_admin = user.get('role') == 'admin'
            is_doctor = False
            
            if user.get('role') == 'doctor':
                doctor = db.doctors.find_one({'user_id': user['id']})
                if doctor and doctor['id'] == doctor_id:
                    is_doctor = True
            
            if not (is_admin or is_doctor):
                response = JsonResponse({'error': 'Unauthorized'}, status=403)
                return add_cors_headers(response)
            
            data = json.loads(request.body)
            
            # Validate required fields
            required_fields = ['date', 'reason']
            for field in required_fields:
                if field not in data:
                    response = JsonResponse({'error': f'{field} is required'}, status=400)
                    return add_cors_headers(response)
            
            # Check if doctor exists
            doctor = db.doctors.find_one({'id': doctor_id})
            if not doctor:
                response = JsonResponse({'error': 'Doctor not found'}, status=404)
                return add_cors_headers(response)
            
            # Create exception
            exception_id = str(uuid.uuid4())
            exception = {
                'id': exception_id,
                'doctor_id': doctor_id,
                'doctor_name': doctor['name'],
                'date': data['date'],
                'reason': data['reason'],
                'created_at': datetime.now(),
                'created_by': user['id']
            }
            
            db.doctor_exceptions.insert_one(exception)
            
            response = JsonResponse(exception, status=201, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # UPDATE a specific exception
        elif request.method in ['PUT', 'PATCH'] and doctor_id is not None and exception_id is not None:
            # Check if user is authorized
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
                response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
                return add_cors_headers(response)
            
            token = auth_header.split(' ')[1]
            user = get_user_from_token(token)
            
            if not user:
                response = JsonResponse({'error': 'Invalid token'}, status=401)
                return add_cors_headers(response)
            
            # Check if user is admin or the doctor
            is_admin = user.get('role') == 'admin'
            is_doctor = False
            
            if user.get('role') == 'doctor':
                doctor = db.doctors.find_one({'user_id': user['id']})
                if doctor and doctor['id'] == doctor_id:
                    is_doctor = True
            
            if not (is_admin or is_doctor):
                response = JsonResponse({'error': 'Unauthorized'}, status=403)
                return add_cors_headers(response)
            
            # Get exception
            exception = db.doctor_exceptions.find_one({'id': exception_id, 'doctor_id': doctor_id})
            if not exception:
                response = JsonResponse({'error': 'Exception not found'}, status=404)
                return add_cors_headers(response)
            
            data = json.loads(request.body)
            
            # Update exception
            db.doctor_exceptions.update_one(
                {'id': exception_id, 'doctor_id': doctor_id},
                {'$set': data}
            )
            
            # Get updated exception
            updated_exception = db.doctor_exceptions.find_one({'id': exception_id, 'doctor_id': doctor_id})
            
            response = JsonResponse(updated_exception, encoder=MongoJSONEncoder)
            return add_cors_headers(response)
        
        # DELETE a specific exception
        elif request.method == 'DELETE' and doctor_id is not None and exception_id is not None:
            # Check if user is authorized
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
                response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
                return add_cors_headers(response)
            
            token = auth_header.split(' ')[1]
            user = get_user_from_token(token)
            
            if not user:
                response = JsonResponse({'error': 'Invalid token'}, status=401)
                return add_cors_headers(response)
            
            # Check if user is admin or the doctor
            is_admin = user.get('role') == 'admin'
            is_doctor = False
            
            if user.get('role') == 'doctor':
                doctor = db.doctors.find_one({'user_id': user['id']})
                if doctor and doctor['id'] == doctor_id:
                    is_doctor = True
            
            if not (is_admin or is_doctor):
                response = JsonResponse({'error': 'Unauthorized'}, status=403)
                return add_cors_headers(response)
            
            # Get exception
            exception = db.doctor_exceptions.find_one({'id': exception_id, 'doctor_id': doctor_id})
            if not exception:
                response = JsonResponse({'error': 'Exception not found'}, status=404)
                return add_cors_headers(response)
            
            # Delete exception
            db.doctor_exceptions.delete_one({'id': exception_id, 'doctor_id': doctor_id})
            
            response = JsonResponse({'message': 'Exception deleted successfully'})
            return add_cors_headers(response)
        
        else:
            response = JsonResponse({'error': 'Method not allowed'}, status=405)
            return add_cors_headers(response)
    except Exception as e:
        print(f"Doctor exceptions error: {str(e)}")
        response = JsonResponse({'error': 'An error occurred while processing your request'}, status=500)
        return add_cors_headers(response)

@csrf_exempt
def new_doctor_form(request):
    """
    Get form fields for creating a new doctor
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    try:
        # Check if user is admin
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header or (not auth_header.startswith('Bearer ') and not auth_header.startswith('Token ')):
            response = JsonResponse({'error': 'Invalid authorization header'}, status=401)
            return add_cors_headers(response)
        
        token = auth_header.split(' ')[1]
        user = get_user_from_token(token)
        
        if not user or user.get('role') != 'admin':
            response = JsonResponse({'error': 'Admin privileges required'}, status=403)
            return add_cors_headers(response)
        
        form_data = {
            "message": "Ready to create new doctor",
            "fields": [
                {"name": "name", "type": "string", "required": True},
                {"name": "specialization", "type": "string", "required": True},
                {"name": "email", "type": "email", "required": True},
                {"name": "phone", "type": "string", "required": True},
                {"name": "qualification", "type": "string", "required": False},
                {"name": "experience_years", "type": "number", "required": False},
                {"name": "consultation_fee", "type": "string", "required": False},
                {"name": "available_days", "type": "string", "required": False},
                {"name": "bio", "type": "text", "required": False},
                {"name": "medical_center_name", "type": "string", "required": False},
                {"name": "emergency_available", "type": "boolean", "required": False},
                {"name": "daily_patient_limit", "type": "number", "required": False}
            ]
        }
        
        response = JsonResponse(form_data)
        return add_cors_headers(response)
    except Exception as e:
        print(f"New doctor form error: {str(e)}")
        response = JsonResponse({'error': 'An error occurred while processing your request'}, status=500)
        return add_cors_headers(response)
    
@require_GET
@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([AllowAny])
def get_csrf_token(request):
    """
    This view sets a CSRF cookie and returns a 200 OK response.
    The CSRF cookie is needed for POST requests.
    """
    response = JsonResponse({"success": True, "message": "CSRF cookie set"})
    return add_cors_headers(response)

@csrf_exempt
@api_view(['GET', 'POST', 'OPTIONS'])
@permission_classes([AllowAny])
def validate_token(request):
    """
    Simple endpoint to validate if a token is valid.
    For MongoDB-based authentication.
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    
    # Print the auth header for debugging
    print(f"Auth header received: {auth_header}")
    
    # Check for both Token and Bearer formats
    if not auth_header:
        return JsonResponse({'valid': False, 'error': 'No token provided'}, status=401)
    
    # Extract the token
    if auth_header.startswith('Token '):
        token = auth_header.split(' ')[1]
    elif auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    else:
        return JsonResponse({'valid': False, 'error': 'Invalid authorization format'}, status=401)
    
    try:
        # Get your secret key from settings
        from django.conf import settings
        secret_key = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
        
        # Decode the token
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        
        # Check if token is expired
        if 'exp' in payload and datetime.fromtimestamp(payload['exp']) < datetime.utcnow():
            return JsonResponse({'valid': False, 'error': 'Token expired'}, status=401)
        
        # Get user from MongoDB
        from pymongo import MongoClient
        client = MongoClient(settings.MONGODB_URI)
        db = client[settings.MONGODB_NAME]
        
        # Find user by ID from token
        user = db.users.find_one({'id': payload.get('user_id')})
        
        if not user:
            return JsonResponse({'valid': False, 'error': 'User not found'}, status=401)
        
        # Token is valid
        response = JsonResponse({
            'valid': True,
            'user_id': payload.get('user_id'),
            'username': user.get('username', user.get('email'))
        })
        return add_cors_headers(response)
        
    except jwt.ExpiredSignatureError:
        return JsonResponse({'valid': False, 'error': 'Token expired'}, status=401)
    except jwt.InvalidTokenError:
        return JsonResponse({'valid': False, 'error': 'Invalid token'}, status=401)
    except Exception as e:
        print(f"Token validation error: {str(e)}")
        return JsonResponse({'valid': False, 'error': f'Token validation failed: {str(e)}'}, status=401)

@csrf_exempt
@api_view(['GET', 'OPTIONS'])
@permission_classes([AllowAny])
def appointments_view(request):
    """
    Endpoint to get appointments with proper CORS and token handling
    """
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return handle_options_request(request)
        
    # Print all headers for debugging
    print("Request headers:")
    for header, value in request.META.items():
        if header.startswith('HTTP_'):
            print(f"{header}: {value}")
    
    # Check for Authorization header
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    
    if not auth_header:
        return JsonResponse({'error': 'No authorization header provided'}, status=401)
    
    # Extract the token - handle both Token and Bearer formats
    if auth_header.startswith('Token '):
        token = auth_header.split(' ')[1]
    elif auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    else:
        return JsonResponse({'error': 'Invalid authorization format'}, status=401)
    
    try:
        # Validate the token
        from django.conf import settings
        secret_key = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
        
        try:
            # Decode the token
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            
            # Check if token is expired
            if 'exp' in payload and datetime.fromtimestamp(payload['exp']) < datetime.utcnow():
                return JsonResponse({'error': 'Token expired'}, status=401)
                
            # Get user from MongoDB
            from pymongo import MongoClient
            client = MongoClient(settings.MONGODB_URI)
            db = client[settings.MONGODB_NAME]
            
            # Find user by ID from token
            user_id = payload.get('user_id')
            user = db.users.find_one({'id': user_id})
            
            if not user:
                return JsonResponse({'error': 'User not found'}, status=401)
                
            # Get appointments for this user
            if user.get('role') == 'admin':
                # Admin sees all appointments
                appointments = list(db.appointments.find())
            elif user.get('role') == 'doctor':
                # Doctor sees their appointments
                doctor = db.doctors.find_one({'user_id': user_id})
                if doctor:
                    appointments = list(db.appointments.find({'doctor': doctor['id']}))
                else:
                    appointments = []
            else:
                # Patient sees their appointments
                appointments = list(db.appointments.find({'patient': user_id}))
                
            # Convert MongoDB ObjectId to string
            for appointment in appointments:
                if '_id' in appointment:
                    appointment['_id'] = str(appointment['_id'])
                    
            response = JsonResponse(appointments, safe=False)
            return add_cors_headers(response)
            
        except jwt.ExpiredSignatureError:
            return JsonResponse({'error': 'Token expired'}, status=401)
        except jwt.InvalidTokenError:
            return JsonResponse({'error': 'Invalid token'}, status=401)
        except Exception as e:
            print(f"Token validation error: {str(e)}")
            return JsonResponse({'error': f'Authentication failed: {str(e)}'}, status=401)
            
    except Exception as e:
        print(f"Error processing appointments request: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def direct_update_appointment_status(request, appointment_id):
    """
    Direct endpoint to update appointment status without permission checks.
    This is a temporary solution for debugging purposes.
    """
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, PATCH, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
        
    if request.method in ['POST', 'PATCH']:
        try:
            # Parse the request body
            data = json.loads(request.body)
            status_value = data.get('status')
            
            if not status_value:
                return JsonResponse({"error": "Status field is required"}, status=400)
            
            print(f"Attempting to update appointment {appointment_id} to status {status_value}")
            
            # Try different ID formats
            update_result = None
            
            # Try with string ID
            update_result = db.appointments.update_one(
                {"id": appointment_id},
                {"$set": {"status": status_value}}
            )
            
            # If no documents were modified, try with ObjectId
            if update_result and update_result.modified_count == 0 and ObjectId.is_valid(appointment_id):
                update_result = db.appointments.update_one(
                    {"_id": ObjectId(appointment_id)},
                    {"$set": {"status": status_value}}
                )
            
            # If still no documents were modified, try with numeric ID
            if update_result and update_result.modified_count == 0:
                try:
                    numeric_id = int(appointment_id)
                    update_result = db.appointments.update_one(
                        {"id": numeric_id},
                        {"$set": {"status": status_value}}
                    )
                except (ValueError, TypeError):
                    pass
            
            # Check if update was successful
            if update_result and update_result.modified_count > 0:
                print(f"Successfully updated appointment {appointment_id} to status {status_value}")
                return JsonResponse({
                    "success": True,
                    "message": f"Appointment {appointment_id} status updated to {status_value}",
                    "id": appointment_id,
                    "status": status_value
                })
            else:
                print(f"Failed to update appointment {appointment_id}: document not found or not modified")
                
                # For debugging, try to find the appointment
                appointment = None
                try:
                    appointment = db.appointments.find_one({"id": appointment_id})
                    if not appointment and ObjectId.is_valid(appointment_id):
                        appointment = db.appointments.find_one({"_id": ObjectId(appointment_id)})
                    if not appointment:
                        try:
                            numeric_id = int(appointment_id)
                            appointment = db.appointments.find_one({"id": numeric_id})
                        except (ValueError, TypeError):
                            pass
                except Exception as e:
                    print(f"Error finding appointment: {str(e)}")
                
                if appointment:
                    print(f"Found appointment but couldn't update it: {appointment}")
                    # Convert ObjectId to string if present
                    if "_id" in appointment and isinstance(appointment["_id"], ObjectId):
                        appointment["_id"] = str(appointment["_id"])
                    return JsonResponse({
                        "error": "Found appointment but couldn't update it",
                        "appointment": appointment,
                        "attempted_status": status_value
                    }, status=500)
                else:
                    return JsonResponse({"error": f"Appointment {appointment_id} not found"}, status=404)
            
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        except Exception as e:
            print(f"Error updating appointment: {str(e)}")
            return JsonResponse({"error": str(e)}, status=500)
    
    return JsonResponse({"error": "Method not allowed"}, status=405)
@csrf_exempt
@require_http_methods(["GET"])
def appointment_stats(request):
    """
    Endpoint to get appointment statistics from MongoDB
    """
    try:
        # Connect to MongoDB
        from pymongo import MongoClient
        client = MongoClient(settings.MONGODB_URI)
        db = client[settings.MONGODB_NAME]
        collection = db['appointments']
        
        # Count total appointments
        total_count = collection.count_documents({})
        
        # Count completed appointments
        completed_count = collection.count_documents({"status": "completed"})
        
        # Count pending/scheduled appointments
        pending_count = collection.count_documents({
            "status": {"$in": ["scheduled", "pending"]}
        })
        
        # Count today's appointments
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        today_count = collection.count_documents({
            "date": {"$regex": f"^{today}"}
        })
        
        # Return the statistics
        return JsonResponse({
            "total": total_count,
            "completed": completed_count,
            "pending": pending_count,
            "today": today_count
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
