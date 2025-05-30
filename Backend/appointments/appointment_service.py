# appointment_service.py
from django.utils import timezone
from bson.objectid import ObjectId
import pymongo
from django.conf import settings
from .mongodb_utils import get_mongodb_database
from .models import User, Doctor, Appointment

def book_appointment(patient_id, doctor_id, appointment_date):
    """
    Book an appointment with MongoDB transaction support
    
    Returns:
        tuple: (success, result)
            - If success is True, result is the appointment ID
            - If success is False, result is an error message
    """
    # Validate inputs
    if not patient_id or not doctor_id or not appointment_date:
        return False, "Missing required fields"
    
    # Check if appointment is in the past
    if appointment_date < timezone.now():
        return False, "Cannot book appointments in the past"
    
    try:
        # Get MongoDB database
        db = get_mongodb_database()
        
        # Check if the time slot is already booked using Django ORM
        existing = Appointment.objects.filter(
            doctor_id=doctor_id,
            date=appointment_date,
            status='scheduled'
        ).exists()
        
        if existing:
            return False, "This time slot is already booked"
        
        # Get patient and doctor info
        try:
            patient = User.objects.get(id=patient_id)
            doctor = Doctor.objects.get(id=doctor_id)
        except (User.DoesNotExist, Doctor.DoesNotExist):
            return False, "Invalid patient or doctor ID"
        
        # Create the appointment using Django ORM
        appointment = Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            date=appointment_date,
            status='scheduled',
            patient_phone=patient.phone
        )
        
        # Store booking history in MongoDB
        booking_entry = {
            'appointment_id': str(appointment.id),
            'patient_name': f"{patient.first_name} {patient.last_name}",
            'date': appointment_date
        }
        
        # Update doctor's booking history in MongoDB
        db.doctor_booking_history.update_one(
            {'doctor_id': str(doctor.id)},
            {'$push': {'bookings': booking_entry}},
            upsert=True
        )
        
        return True, appointment.id
                
    except Exception as e:
        return False, f"Error booking appointment: {str(e)}"