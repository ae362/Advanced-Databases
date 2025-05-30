from rest_framework import serializers
from bson import ObjectId
from decimal import Decimal
from datetime import datetime
from .mongo_utils import get_mongodb_database, mongo_id_to_str

# Get MongoDB database
db = get_mongodb_database()

class MongoModelSerializer(serializers.Serializer):
    """
    Base serializer for MongoDB documents
    """
    id = serializers.CharField(read_only=True)
    
    def to_representation(self, instance):
        """
        Convert MongoDB document to a dictionary with string IDs
        """
        return mongo_id_to_str(instance)

class MedicalCenterSerializer(MongoModelSerializer):
    name = serializers.CharField(max_length=100)
    address = serializers.CharField()
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_null=True)
    website = serializers.URLField(required=False, allow_null=True)
    
    def create(self, validated_data):
        result = db.medical_centers.insert_one(validated_data)
        return {**validated_data, '_id': result.inserted_id}
    
    def update(self, instance, validated_data):
        db.medical_centers.update_one({'_id': ObjectId(instance['_id'])}, {'$set': validated_data})
        return {**instance, **validated_data}

class UserSerializer(MongoModelSerializer):
    username = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    birthday = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(max_length=20, required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    chronic_diseases = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    medical_history = serializers.CharField(required=False, allow_blank=True)
    avatar = serializers.CharField(required=False, allow_null=True)
    role = serializers.CharField(max_length=20, default='patient')
    recent_doctor_name = serializers.SerializerMethodField()
    
    def get_recent_doctor_name(self, obj):
        if 'recent_doctor' in obj and obj['recent_doctor']:
            doctor = db.doctors.find_one({'_id': ObjectId(obj['recent_doctor'])})
            if doctor:
                return f"Dr. {doctor['name']}"
        return None
    
    def create(self, validated_data):
        # Generate username from email if not provided
        if 'username' not in validated_data:
            email = validated_data['email']
            username = email.split('@')[0]
            base_username = username
            counter = 1
            while db.users.find_one({'username': username}):
                username = f"{base_username}{counter}"
                counter += 1
            validated_data['username'] = username
        
        # Set default values
        validated_data['date_joined'] = datetime.now()
        validated_data['is_active'] = True
        validated_data['is_staff'] = validated_data.get('role') == 'doctor' or validated_data.get('role') == 'admin'
        validated_data['is_superuser'] = validated_data.get('role') == 'admin'
        
        result = db.users.insert_one(validated_data)
        return {**validated_data, '_id': result.inserted_id}
    
    def update(self, instance, validated_data):
        db.users.update_one({'_id': ObjectId(instance['_id'])}, {'$set': validated_data})
        return {**instance, **validated_data}

class DoctorSerializer(MongoModelSerializer):
    name = serializers.CharField(max_length=100)
    specialization = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    qualification = serializers.CharField(max_length=100, default="No qualification")
    experience_years = serializers.IntegerField(default=0, min_value=0)
    consultation_fee = serializers.DecimalField(max_digits=10, decimal_places=2, default=Decimal('20.00'), min_value=Decimal('20.00'))
    available_days = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    medical_center = serializers.CharField(required=False, allow_null=True)
    medical_center_name = serializers.SerializerMethodField()
    emergency_available = serializers.BooleanField(default=False)
    daily_patient_limit = serializers.IntegerField(default=10)
    is_available = serializers.BooleanField(default=True)
    booking_history = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    def get_medical_center_name(self, obj):
        if 'medical_center' in obj and obj['medical_center']:
            medical_center = db.medical_centers.find_one({'_id': ObjectId(obj['medical_center'])})
            if medical_center:
                return medical_center['name']
        return None
    
    def create(self, validated_data):
        result = db.doctors.insert_one(validated_data)
        return {**validated_data, '_id': result.inserted_id}
    
    def update(self, instance, validated_data):
        db.doctors.update_one({'_id': ObjectId(instance['_id'])}, {'$set': validated_data})
        return {**instance, **validated_data}

class AppointmentSerializer(MongoModelSerializer):
    patient = serializers.CharField()
    doctor = serializers.CharField()
    date = serializers.DateTimeField()
    notes = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(default='scheduled')
    blood_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    medications = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    allergies = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    medical_conditions = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    reason_for_visit = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    patient_phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    
    def get_patient_name(self, obj):
        if 'patient' in obj:
            patient = db.users.find_one({'_id': ObjectId(obj['patient'])})
            if patient:
                return f"{patient.get('first_name', '')} {patient.get('last_name', '')}"
        return ""
    
    def get_doctor_name(self, obj):
        if 'doctor' in obj:
            doctor = db.doctors.find_one({'_id': ObjectId(obj['doctor'])})
            if doctor:
                return doctor.get('name', '')
        return ""
    
    def create(self, validated_data):
        # Set default values
        validated_data['created_at'] = datetime.now()
        
        # Check if date is in the past
        if validated_data['date'] < datetime.now():
            validated_data['status'] = 'completed'
        
        result = db.appointments.insert_one(validated_data)
        
        # Update patient's recent doctor
        if validated_data['status'] == 'completed' and 'patient' in validated_data:
            db.users.update_one(
                {'_id': ObjectId(validated_data['patient'])},
                {'$set': {'recent_doctor': validated_data['doctor']}}
            )
        
        return {**validated_data, '_id': result.inserted_id}
    
    def update(self, instance, validated_data):
        db.appointments.update_one({'_id': ObjectId(instance['_id'])}, {'$set': validated_data})
        
        # Update patient's recent doctor if status changed to completed
        if validated_data.get('status') == 'completed' and instance.get('status') != 'completed':
            db.users.update_one(
                {'_id': ObjectId(instance['patient'])},
                {'$set': {'recent_doctor': instance['doctor']}}
            )
        
        return {**instance, **validated_data}

class RegistrationSerializer(MongoModelSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    username = serializers.CharField(required=False)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    birthday = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(max_length=20, required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    chronic_diseases = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    medical_history = serializers.CharField(required=False, allow_blank=True)
    
    def create(self, validated_data):
        from .mongo_auth import hash_password
        
        # Hash password
        password = validated_data.pop('password')
        validated_data['password'] = hash_password(password)
        
        # Generate username from email if not provided
        if 'username' not in validated_data:
            email = validated_data['email']
            username = email.split('@')[0]
            base_username = username
            counter = 1
            while db.users.find_one({'username': username}):
                username = f"{base_username}{counter}"
                counter += 1
            validated_data['username'] = username
        
        # Set default values
        validated_data['date_joined'] = datetime.now()
        validated_data['is_active'] = True
        validated_data['is_staff'] = validated_data.get('role') == 'doctor' or validated_data.get('role') == 'admin'
        validated_data['is_superuser'] = validated_data.get('role') == 'admin'
        
        result = db.users.insert_one(validated_data)
        return {**validated_data, '_id': result.inserted_id}

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})

class PatientRegistrationSerializer(RegistrationSerializer):
    role = serializers.CharField(default='patient', read_only=True)

class DoctorRegistrationSerializer(RegistrationSerializer):
    role = serializers.CharField(default='doctor', read_only=True)
    specialization = serializers.CharField(required=True)
    qualification = serializers.CharField(required=True)
    experience_years = serializers.IntegerField(default=0, min_value=0)
    consultation_fee = serializers.DecimalField(max_digits=10, decimal_places=2, default=Decimal('20.00'), min_value=Decimal('20.00'))
    available_days = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    medical_center = serializers.CharField(required=False, allow_null=True)
    emergency_available = serializers.BooleanField(default=False)
    daily_patient_limit = serializers.IntegerField(default=10)
    is_available = serializers.BooleanField(default=True)
    
    def create(self, validated_data):
        from .mongo_auth import hash_password
        
        # Extract doctor-specific fields
        doctor_fields = {
            'specialization': validated_data.pop('specialization'),
            'qualification': validated_data.pop('qualification'),
            'experience_years': validated_data.pop('experience_years', 0),
            'consultation_fee': validated_data.pop('consultation_fee', Decimal('20.00')),
            'available_days': validated_data.pop('available_days', None),
            'bio': validated_data.pop('bio', ''),
            'medical_center': validated_data.pop('medical_center', None),
            'emergency_available': validated_data.pop('emergency_available', False),
            'daily_patient_limit': validated_data.pop('daily_patient_limit', 10),
            'is_available': validated_data.pop('is_available', True)
        }
        
        # Hash password
        password = validated_data.pop('password')
        validated_data['password'] = hash_password(password)
        
        # Ensure role is set to doctor
        validated_data['role'] = 'doctor'
        
        # Generate username from email if not provided
        if 'username' not in validated_data:
            email = validated_data['email']
            username = email.split('@')[0]
            base_username = username
            counter = 1
            while db.users.find_one({'username': username}):
                username = f"{base_username}{counter}"
                counter += 1
            validated_data['username'] = username
        
        # Set default values
        validated_data['date_joined'] = datetime.now()
        validated_data['is_active'] = True
        validated_data['is_staff'] = True
        validated_data['is_superuser'] = False
        
        # Create user
        user_result = db.users.insert_one(validated_data)
        user_id = user_result.inserted_id
        
        # Create doctor profile
        doctor_data = {
            'name': f"{validated_data['first_name']} {validated_data['last_name']}",
            'email': validated_data['email'],
            'phone': validated_data.get('phone', ''),
            'user_id': str(user_id),
            **doctor_fields
        }
        
        db.doctors.insert_one(doctor_data)
        
        return {**validated_data, '_id': user_id}

class DoctorAvailabilitySerializer(MongoModelSerializer):
    doctor = serializers.CharField()
    day_of_week = serializers.IntegerField(min_value=0, max_value=6)
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    is_available = serializers.BooleanField(default=True)
    day_name = serializers.SerializerMethodField()
    
    def get_day_name(self, obj):
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[obj['day_of_week']]
    
    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError("End time must be after start time")
        return data
    
    def create(self, validated_data):
        result = db.doctor_availability.insert_one(validated_data)
        return {**validated_data, '_id': result.inserted_id}
    
    def update(self, instance, validated_data):
        db.doctor_availability.update_one({'_id': ObjectId(instance['_id'])}, {'$set': validated_data})
        return {**instance, **validated_data}

class AvailabilityExceptionSerializer(MongoModelSerializer):
    doctor = serializers.CharField()
    date = serializers.DateField()
    is_available = serializers.BooleanField(default=False)
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate_date(self, value):
        if value < datetime.now().date():
            raise serializers.ValidationError("Cannot set exceptions for past dates")
        return value
    
    def create(self, validated_data):
        result = db.availability_exceptions.insert_one(validated_data)
        return {**validated_data, '_id': result.inserted_id}
    
    def update(self, instance, validated_data):
        db.availability_exceptions.update_one({'_id': ObjectId(instance['_id'])}, {'$set': validated_data})
        return {**instance, **validated_data}