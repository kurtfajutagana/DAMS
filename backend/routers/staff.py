import os
import random
import string
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from services.db import supabase
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

router = APIRouter()

# ----------------- PATIENT CREATION -----------------

class CreatePatientRequest(BaseModel):
    formData: Dict[str, Any]
    medicalAnswers: Dict[str, Any]
    allergies: Dict[str, Any]
    diseases: Dict[str, Any]
    teethChart: List[Dict[str, Any]]

@router.post("/patients")
async def create_patient(req: CreatePatientRequest):
    form_data = req.formData
    email = form_data.get("email", "").strip()
    
    # Generate placeholder email if none provided
    if not email:
        timestamp = int(datetime.utcnow().timestamp())
        random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        email = f"walkin_{timestamp}_{random_str}@teethtalk.local"
        
    password = ''.join(random.choices(string.ascii_letters + string.digits + "!@#$%^&*", k=12))
    
    try:
        # 1. Create Auth User
        auth_response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True, # Auto-confirm for walk-ins
            "user_metadata": {
                "first_name": form_data.get("firstName", ""),
                "last_name": form_data.get("lastName", ""),
                "role": "patient"
            }
        })
        
        user = auth_response.user
        if not user:
            raise Exception("Auth user creation failed.")
            
        patient_id = user.id
        
        # 2. Update Profile with all details
        # The trigger on auth.users might have already created a profile.
        # So we UPDATE instead of INSERT, or upsert.
        supabase.table("profiles").upsert({
            "id": patient_id,
            "role": "patient",
            "first_name": form_data.get("firstName", ""),
            "last_name": form_data.get("lastName", ""),
            "contact_number": form_data.get("phone", ""),
            "is_email_verified": True,
            "nickname": form_data.get("nickname", ""),
            "date_of_birth": form_data.get("birthdate", None) or None,
            "gender": form_data.get("gender", ""),
            "height_cm": float(form_data.get("height", 0)) if form_data.get("height") else None,
            "weight_kg": float(form_data.get("weight", 0)) if form_data.get("weight") else None,
            "address": form_data.get("address", ""),
            "nationality": form_data.get("nationality", ""),
            "religion": form_data.get("religion", ""),
            "occupation": form_data.get("occupation", ""),
            "parent_name": form_data.get("parentName", ""),
            "parent_occupation": form_data.get("parentOccupation", "")
        }).execute()
        
        # 3. Create Medical History
        medical_answers = req.medicalAnswers
        supabase.table("medical_histories").insert({
            "patient_id": patient_id,
            "referrer": form_data.get("referrer", ""),
            "consultation_reason": form_data.get("consultationReason", ""),
            "previous_dentist": form_data.get("prevDentist", ""),
            "last_dental_visit": form_data.get("lastVisit", None) or None,
            "previous_extraction": form_data.get("extraction") == "yes",
            "q_good_health": medical_answers.get("q0") == "yes",
            "q_medical_treatment": medical_answers.get("q1") == "yes",
            "q_medical_treatment_details": medical_answers.get("q1_detail", ""),
            "q_surgical_operation": medical_answers.get("q2") == "yes",
            "q_surgical_operation_details": medical_answers.get("q2_detail", ""),
            "q_hospitalized": medical_answers.get("q3") == "yes",
            "q_hospitalized_details": medical_answers.get("q3_detail", ""),
            "q_medication": medical_answers.get("q4") == "yes",
            "q_medication_details": medical_answers.get("q4_detail", ""),
            "q_tobacco": medical_answers.get("q5") == "yes",
            "q_drugs_alcohol": medical_answers.get("q6") == "yes",
            "q_allergic": medical_answers.get("q7") == "yes",
            "bleeding_time": medical_answers.get("q8", ""),
            "q_pregnant": medical_answers.get("q9_preg") == "yes",
            "q_nursing": medical_answers.get("q9_nurse") == "yes",
            "q_birth_control": medical_answers.get("q9_pill") == "yes",
            "allergies": {k: v for k, v in req.allergies.items() if v},
            "underlying_conditions": {k: v for k, v in req.diseases.items() if v}
        }).execute()
        
        # 4. Create Tooth Conditions
        tooth_records = []
        for tooth in req.teethChart:
            # Map frontend conditions ('Sound', 'Decayed', 'Missing', 'Filled') 
            # to DB enum ('healthy', 'needs-attention', 'missing', 'treated')
            status = 'healthy'
            if tooth["condition"] == "Decayed":
                status = "needs-attention"
            elif tooth["condition"] == "Missing":
                status = "missing"
            elif tooth["condition"] == "Filled":
                status = "treated"
                
            tooth_records.append({
                "patient_id": patient_id,
                "tooth_number": tooth["toothNumber"],
                "status": status,
                "notes": f"Initial state from registration: {tooth['condition']}"
            })
            
        if tooth_records:
            supabase.table("tooth_conditions").insert(tooth_records).execute()
            
        # 5. Send Welcome Email via SendGrid (if real email provided)
        if not email.endswith("@teethtalk.local"):
            sg_api_key = os.getenv("SENDGRID_API_KEY")
            sg_from_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@teethtalk.com")
            
            if sg_api_key:
                html_content = f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
                    <h2>Welcome to Teeth Talk Dental Clinic</h2>
                    <p>Your patient record has been successfully created.</p>
                    <p>You can now log in to our patient portal using the following credentials:</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Temporary Password:</strong> {password}</p>
                    <p>Please change your password after your first login.</p>
                </div>
                """
                message = Mail(
                    from_email=sg_from_email,
                    to_emails=email,
                    subject='Welcome to Teeth Talk - Patient Portal Access',
                    html_content=html_content
                )
                try:
                    sg = SendGridAPIClient(sg_api_key)
                    sg.send(message)
                except Exception as e:
                    print(f"Failed to send welcome email: {str(e)}")

        return {"message": "Patient created successfully", "patient_id": patient_id}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create patient: {str(e)}")


@router.get("/patients")
async def get_patients():
    try:
        res = supabase.table("profiles") \
            .select("id, first_name, last_name, contact_number") \
            .eq("role", "patient") \
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patients/{patient_id}/full-record")
async def get_patient_full_record(patient_id: str):
    try:
        profile_res = supabase.table("profiles").select("*").eq("id", patient_id).execute()
        if not profile_res.data:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        
        medical_history_res = supabase.table("medical_histories").select("*").eq("patient_id", patient_id).execute()
        tooth_conditions_res = supabase.table("tooth_conditions").select("*").eq("patient_id", patient_id).execute()

        # The frontend still expects a patient_profile object for demographic data in some components, 
        # so we will pass the profile object as patient_profile too to maintain compatibility.
        profile_data = profile_res.data[0] if profile_res.data else {}
        return {
            "profile": profile_data,
            "patient_profile": profile_data,
            "medical_history": medical_history_res.data[0] if medical_history_res.data else {},
            "tooth_conditions": tooth_conditions_res.data if tooth_conditions_res.data else []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------- QUEUE MANAGEMENT -----------------

@router.get("/queue")
async def get_queue(branch_id: Optional[str] = None):
    # Fetch today's queue entries using the appointments table
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    try:
        query = supabase.table("appointments") \
            .select("*, patient:profiles!appointments_patient_id_fkey(first_name, last_name, contact_number), dentist:profiles!appointments_dentist_id_fkey(first_name, last_name)") \
            .gte("created_at", today_start) \
            .in_("status", ["waiting", "in_progress", "completed", "cancelled"])
            
        if branch_id:
            query = query.eq("branch_id", branch_id)
            
        res = query.order("created_at").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AddToQueueRequest(BaseModel):
    patient_id: str
    dentist_id: Optional[str] = None
    service_requested: str
    notes: Optional[str] = ""
    branch_id: Optional[str] = None

@router.post("/queue")
async def add_to_queue(req: AddToQueueRequest):
    # Walk-ins are instantly created as appointments with status waiting
    try:
        res = supabase.table("appointments").insert({
            "patient_id": req.patient_id,
            "dentist_id": req.dentist_id,
            "appointment_date": datetime.utcnow().isoformat(),
            "service_requested": req.service_requested,
            "notes": req.notes,
            "status": "waiting",
            "branch_id": req.branch_id
        }).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class UpdateQueueStatusRequest(BaseModel):
    status: str # 'waiting', 'in_progress', 'completed', 'cancelled'

@router.patch("/queue/{entry_id}/status")
async def update_queue_status(entry_id: str, req: UpdateQueueStatusRequest):
    valid_statuses = ["waiting", "in_progress", "completed", "cancelled"]
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
        
    try:
        res = supabase.table("appointments").update({
            "status": req.status
        }).eq("id", entry_id).execute()
        
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- VISIT LOGS -----------------

@router.get("/visit-logs")
async def get_visit_logs():
    # Fetch all completed treatments or completed queue entries (now appointments)
    try:
        res = supabase.table("appointments") \
            .select("*, patient:profiles!appointments_patient_id_fkey(first_name, last_name), dentist:profiles!appointments_dentist_id_fkey(first_name, last_name)") \
            .eq("status", "completed") \
            .order("created_at", desc=True) \
            .execute()
            
        logs = res.data
        
        # Fetch billing services to map costs
        billing_res = supabase.table("billing_services").select("service_name, cost").execute()
        billing_map = {b['service_name'].lower(): b['cost'] for b in billing_res.data}
        
        for log in logs:
            service = log.get("service_requested", "")
            # Simple match. If not exact, might return N/A.
            fee = billing_map.get(service.lower(), "N/A")
            log["consultation_fee"] = fee
            
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- PRESCRIPTIONS & REMINDERS -----------------
import re
from datetime import timedelta

class CreatePrescriptionRequest(BaseModel):
    patient_id: str
    dentist_id: str
    medication_name: str
    dosage_instructions: str
    start_date: str
    end_date: str
    notes: Optional[str] = ""

@router.post("/prescriptions")
async def create_prescription(req: CreatePrescriptionRequest):
    try:
        # 1. Insert Prescription
        rx_res = supabase.table("prescriptions").insert({
            "patient_id": req.patient_id,
            "dentist_id": req.dentist_id,
            "medication_name": req.medication_name,
            "dosage_instructions": req.dosage_instructions,
            "start_date": req.start_date,
            "end_date": req.end_date,
            "is_active": True
        }).execute()
        
        prescription = rx_res.data[0]
        prescription_id = prescription["id"]
        
        # 2. Rule-Based Engine Hook for Reminders
        # Parse dosage_instructions (e.g. "Take 1 pill every 8 hours" or "twice a day")
        instructions = req.dosage_instructions.lower()
        
        interval_hours = 24  # Default to once a day
        
        # Extract "every X hours"
        match_hours = re.search(r'every\s+(\d+)\s+hours?', instructions)
        if match_hours:
            interval_hours = int(match_hours.group(1))
        elif "twice a day" in instructions or "2 times a day" in instructions:
            interval_hours = 12
        elif "three times a day" in instructions or "3 times a day" in instructions:
            interval_hours = 8
        elif "four times a day" in instructions or "4 times a day" in instructions:
            interval_hours = 6
            
        start_dt = datetime.fromisoformat(req.start_date.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(req.end_date.replace("Z", "+00:00"))
        
        # Ensure we schedule at least starting from today/now if start_dt is today
        current_time = datetime.utcnow().replace(tzinfo=start_dt.tzinfo)
        if start_dt < current_time:
            start_dt = current_time
            
        # Generate timestamps
        reminders = []
        schedule_dt = start_dt
        while schedule_dt <= end_dt:
            reminders.append({
                "prescription_id": prescription_id,
                "patient_id": req.patient_id,
                "scheduled_time": schedule_dt.isoformat(),
                "status": "pending"
            })
            schedule_dt += timedelta(hours=interval_hours)
            
            # Failsafe to prevent infinite loops or too many reminders
            if len(reminders) > 100:
                break
                
        if reminders:
            supabase.table("reminders").insert(reminders).execute()
            
        return {"message": "Prescription created successfully", "prescription": prescription, "reminders_scheduled": len(reminders)}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- BILLING & PAYMENTS -----------------
class UploadReceiptRequest(BaseModel):
    patient_id: str
    amount: float
    receipt_url: str
    payment_method: str # "GCash" or "Bank Transfer"

@router.post("/billing/upload")
async def upload_receipt(req: UploadReceiptRequest):
    try:
        # Create a new invoice that is pending verification
        new_invoice_res = supabase.table("invoices").insert({
            "patient_id": req.patient_id,
            "procedure_name": "General Consultation", # Default or should be passed from frontend
            "amount_due": req.amount,
            "status": "pending_verification",
            "receipt_url": req.receipt_url,
            "payment_method": req.payment_method
        }).execute()
        
        return new_invoice_res.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/billing/pending")
async def get_pending_billing():
    try:
        # Fetch invoices that are pending verification
        res = supabase.table("invoices").select("*, patient:profiles!invoices_patient_id_fkey(first_name, last_name, contact_number)").eq("status", "pending_verification").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/billing/all")
async def get_all_billing():
    try:
        # Fetch all invoices regardless of status
        res = supabase.table("invoices").select("*, patient:profiles!invoices_patient_id_fkey(first_name, last_name, contact_number)").order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class VerifyBillingRequest(BaseModel):
    payment_method: Optional[str] = None

@router.post("/billing/verify/{record_id}")
async def verify_billing(record_id: str, req: VerifyBillingRequest = VerifyBillingRequest()):
    try:
        update_data = {"status": "paid"}
        if req.payment_method:
            update_data["payment_method"] = req.payment_method
            
        res = supabase.table("invoices").update(update_data).eq("id", record_id).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
