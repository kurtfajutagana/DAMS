import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.db import supabase

# Get a valid patient ID for testing
profiles = supabase.table("profiles").select("id").eq("role", "patient").limit(1).execute()
if profiles.data:
    patient_id = profiles.data[0]['id']
    print(f"Patient ID: {patient_id}")
    
    # Query appointments with doctor names
    appointments = supabase.table("appointments").select(
        "id, appointment_date, notes, profiles!appointments_dentist_id_fkey(first_name, last_name)"
    ).eq("patient_id", patient_id).eq("status", "scheduled").execute()
    
    print(appointments.data)
else:
    print("No patients found.")
