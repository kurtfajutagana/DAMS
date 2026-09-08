import os
import random
import string
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from services.db import supabase
import requests

router = APIRouter()

# ----------------- PATIENT DUPLICATE CHECK & CREATION -----------------

@router.get("/patients/check-duplicate")
async def check_patient_duplicate(
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    dob: Optional[str] = None
):
    first_name = (first_name or "").strip()
    last_name = (last_name or "").strip()
    phone = (phone or "").strip()
    email = (email or "").strip().lower()
    dob = (dob or "").strip()

    clean_phone = "".join(filter(str.isdigit, phone)) if phone else ""

    # Only perform search if there's enough input
    if not ((first_name and last_name) or (clean_phone and len(clean_phone) >= 7) or email):
        return {"has_duplicate": False, "matches": []}

    try:
        res = supabase.table("profiles") \
            .select("id, first_name, last_name, contact_number, date_of_birth, is_email_verified, created_at, branch_id") \
            .eq("role", "patient") \
            .execute()
        all_patients = res.data or []

        matches = []
        for p in all_patients:
            p_id = p["id"]
            p_first = (p.get("first_name") or "").strip().lower()
            p_last = (p.get("last_name") or "").strip().lower()
            p_phone = (p.get("contact_number") or "").strip()
            clean_p_phone = "".join(filter(str.isdigit, p_phone)) if p_phone else ""
            p_dob = (p.get("date_of_birth") or "").strip()

            reasons = []
            confidence = "low"

            # Check phone match
            if clean_phone and len(clean_phone) >= 7 and clean_p_phone and (clean_phone == clean_p_phone or clean_phone in clean_p_phone or clean_p_phone in clean_phone):
                reasons.append(f"Matching contact number ({p_phone})")
                confidence = "high" if (first_name and first_name.lower() in p_first) else "medium"

            # Check name match
            exact_first = first_name and (first_name.lower() == p_first)
            exact_last = last_name and (last_name.lower() == p_last)
            similar_first = first_name and (first_name.lower() in p_first or p_first in first_name.lower())
            similar_last = last_name and (last_name.lower() in p_last or p_last in last_name.lower())

            if exact_first and exact_last:
                if dob and p_dob and dob == p_dob:
                    reasons.append(f"Identical full name & Date of Birth ({p_dob})")
                    confidence = "high"
                elif clean_phone and clean_p_phone and clean_phone == clean_p_phone:
                    reasons.append(f"Identical full name & Phone number ({p_phone})")
                    confidence = "high"
                else:
                    reasons.append("Identical full name")
                    if confidence != "high":
                        confidence = "medium"
            elif similar_first and similar_last and (exact_first or exact_last):
                if dob and p_dob and dob == p_dob:
                    reasons.append(f"Similar name & matching Date of Birth ({p_dob})")
                    confidence = "high"
                elif clean_phone and clean_p_phone and clean_phone == clean_p_phone:
                    reasons.append(f"Similar name & matching Phone ({p_phone})")
                    confidence = "high"

            if reasons:
                matches.append({
                    "id": p_id,
                    "first_name": p.get("first_name"),
                    "last_name": p.get("last_name"),
                    "contact_number": p.get("contact_number"),
                    "date_of_birth": p.get("date_of_birth"),
                    "is_email_verified": bool(p.get("is_email_verified")),
                    "account_type": "portal" if p.get("is_email_verified") else "walk_in",
                    "created_at": p.get("created_at"),
                    "confidence": confidence,
                    "reasons": reasons
                })

        confidence_order = {"high": 0, "medium": 1, "low": 2}
        matches.sort(key=lambda m: confidence_order.get(m["confidence"], 3))

        return {
            "has_duplicate": len(matches) > 0,
            "match_count": len(matches),
            "matches": matches[:5]
        }
    except Exception as e:
        print(f"Error checking duplicates: {str(e)}")
        return {"has_duplicate": False, "matches": []}


class CreatePatientRequest(BaseModel):
    formData: Dict[str, Any]
    medicalAnswers: Dict[str, Any]
    allergies: Dict[str, Any]
    diseases: Dict[str, Any]
    teethChart: List[Dict[str, Any]]
    branch_id: Optional[str] = None
    allow_duplicate: Optional[bool] = False

@router.post("/patients")
async def create_patient(req: CreatePatientRequest):
    form_data = req.formData
    first_name = (form_data.get("firstName") or "").strip()
    last_name = (form_data.get("lastName") or "").strip()
    phone = (form_data.get("phone") or "").strip()
    dob = (form_data.get("birthdate") or "").strip()
    email = form_data.get("email", "").strip()
    create_portal = form_data.get("createPortalAccount", True) and bool(email)

    # Duplicate Guard (Strict Validation)
    if not req.allow_duplicate and first_name and last_name:
        clean_phone = "".join(filter(str.isdigit, phone)) if phone else ""
        try:
            p_res = supabase.table("profiles") \
                .select("id, first_name, last_name, contact_number, date_of_birth, is_email_verified") \
                .eq("role", "patient") \
                .execute()
            for p in (p_res.data or []):
                p_first = (p.get("first_name") or "").strip().lower()
                p_last = (p.get("last_name") or "").strip().lower()
                p_phone = "".join(filter(str.isdigit, p.get("contact_number") or ""))
                p_dob = (p.get("date_of_birth") or "").strip()

                is_same_name = (first_name.lower() == p_first and last_name.lower() == p_last)
                is_same_contact = bool(clean_phone and len(clean_phone) >= 7 and p_phone and clean_phone == p_phone)
                is_same_dob = bool(dob and p_dob and dob == p_dob)

                if is_same_name and (is_same_contact or is_same_dob):
                    raise HTTPException(
                        status_code=409,
                        detail=f"A patient record for '{p.get('first_name')} {p.get('last_name')}' already exists (ID: {p['id'][:8].upper()}) with matching {'contact number' if is_same_contact else 'birthdate'}."
                    )
        except HTTPException:
            raise
        except Exception as err:
            print("Duplicate guard verification skipped:", err)
    
    password = ''.join(random.choices(string.ascii_letters + string.digits + "!@#$%^&*", k=12))
    
    try:
        if create_portal:
            # 1. Create Auth User with credentials
            auth_response = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
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
            is_verified = True
        else:
            # Walk-in clinical record only (no login credentials required)
            patient_id = str(uuid.uuid4())
            is_verified = False
        
        # 2. Update/Insert Profile with all details
        supabase.table("profiles").upsert({
            "id": patient_id,
            "role": "patient",
            "branch_id": req.branch_id,
            "first_name": form_data.get("firstName", ""),
            "last_name": form_data.get("lastName", ""),
            "contact_number": form_data.get("phone", ""),
            "is_email_verified": is_verified,
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
            
        # 5. Send Welcome Email via Brevo (Sendinblue)
        if not email.endswith("@teethtalk.local"):
            brevo_api_key = os.getenv("BREVO_API_KEY")
            brevo_from_email = os.getenv("BREVO_FROM_EMAIL", "dams.no.reply@gmail.com")
            
            if brevo_api_key:
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
                
                url = "https://api.brevo.com/v3/smtp/email"
                headers = {
                    "accept": "application/json",
                    "api-key": brevo_api_key,
                    "content-type": "application/json"
                }
                payload = {
                    "sender": {"email": brevo_from_email, "name": "Teeth Talk Clinic"},
                    "to": [{"email": email}],
                    "subject": "Welcome to Teeth Talk - Patient Portal Access",
                    "htmlContent": html_content
                }
                
                try:
                    res = requests.post(url, json=payload, headers=headers)
                    res.raise_for_status()
                except Exception as e:
                    print(f"Failed to send welcome email: {str(e)}")

        return {"message": "Patient created successfully", "patient_id": patient_id}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create patient: {str(e)}")


@router.get("/patients")
async def get_patients():
    try:
        res = supabase.table("profiles") \
            .select("id, first_name, last_name, contact_number, is_email_verified, created_at, branch_id") \
            .eq("role", "patient") \
            .order("first_name", { "ascending": True }) \
            .execute()
        patients = res.data or []
        for p in patients:
            p["has_account"] = bool(p.get("is_email_verified"))
            p["account_type"] = "portal" if p.get("is_email_verified") else "walk_in"
        return patients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ActivatePortalRequest(BaseModel):
    email: str
    password: Optional[str] = None

@router.post("/patients/{patient_id}/activate-portal")
async def activate_patient_portal(patient_id: str, req: ActivatePortalRequest):
    email = req.email.strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required to activate portal account.")
    
    # Check if profile exists
    p_res = supabase.table("profiles").select("*").eq("id", patient_id).execute()
    if not p_res.data:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
    
    profile = p_res.data[0]
    password = req.password or ''.join(random.choices(string.ascii_letters + string.digits + "!@#$%^&*", k=12))
    
    try:
        # Create or link Auth user
        try:
            supabase.auth.admin.create_user({
                "id": patient_id,
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {
                    "first_name": profile.get("first_name", ""),
                    "last_name": profile.get("last_name", ""),
                    "role": "patient"
                }
            })
        except Exception:
            # If user already exists in auth, update credentials
            try:
                supabase.auth.admin.update_user_by_id(patient_id, {
                    "email": email,
                    "password": password,
                    "email_confirm": True
                })
            except Exception:
                pass
        
        # Mark is_email_verified = True in profiles
        supabase.table("profiles").update({
            "is_email_verified": True
        }).eq("id", patient_id).execute()
        
        # Dispatch welcome email if Brevo is configured
        brevo_api_key = os.getenv("BREVO_API_KEY")
        brevo_from_email = os.getenv("BREVO_FROM_EMAIL", "dams.no.reply@gmail.com")
        if brevo_api_key and not email.endswith("@teethtalk.local"):
            html_content = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
                <h2>Welcome to Teeth Talk Dental Portal</h2>
                <p>Hello {profile.get('first_name', '')}, your patient portal login has been activated.</p>
                <p>You can now log in to view your dental chart, appointment history, and billing ledger:</p>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Temporary Password:</strong> {password}</p>
                <p>Please change your password upon your first login.</p>
            </div>
            """
            try:
                requests.post(
                    "https://api.brevo.com/v3/smtp/email",
                    json={
                        "sender": {"email": brevo_from_email, "name": "Teeth Talk Clinic"},
                        "to": [{"email": email}],
                        "subject": "Your Teeth Talk Patient Portal Account is Ready",
                        "htmlContent": html_content
                    },
                    headers={"accept": "application/json", "api-key": brevo_api_key, "content-type": "application/json"}
                )
            except Exception as e:
                print("Failed to dispatch welcome email:", e)

        return {"message": "Portal account activated successfully!", "patient_id": patient_id, "email": email, "temporary_password": password}
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

        treatments_data = []
        try:
            t_res = supabase.table("treatments").select("*, dentist:profiles!treatments_dentist_id_fkey(first_name, last_name)").eq("patient_id", patient_id).execute()
            treatments_data = t_res.data or []
        except Exception:
            try:
                t_res = supabase.table("treatments").select("*").eq("patient_id", patient_id).execute()
                treatments_data = t_res.data or []
            except Exception:
                treatments_data = []

        appointments_data = []
        try:
            a_res = supabase.table("appointments").select("*, dentist:profiles!appointments_dentist_id_fkey(first_name, last_name), branch:branches!appointments_branch_id_fkey(branch_name)").eq("patient_id", patient_id).order("appointment_date", desc=True).execute()
            appointments_data = a_res.data or []
        except Exception:
            try:
                a_res = supabase.table("appointments").select("*").eq("patient_id", patient_id).order("appointment_date", desc=True).execute()
                appointments_data = a_res.data or []
            except Exception:
                appointments_data = []

        # The frontend still expects a patient_profile object for demographic data in some components, 
        # so we will pass the profile object as patient_profile too to maintain compatibility.
        profile_data = profile_res.data[0] if profile_res.data else {}
        return {
            "profile": profile_data,
            "patient_profile": profile_data,
            "medical_history": medical_history_res.data[0] if medical_history_res.data else {},
            "tooth_conditions": tooth_conditions_res.data if tooth_conditions_res.data else [],
            "treatments": treatments_data,
            "appointments": appointments_data
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
            .select("*, patient:profiles!appointments_patient_id_fkey(first_name, last_name, contact_number, is_email_verified), dentist:profiles!appointments_dentist_id_fkey(first_name, last_name)") \
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
async def get_visit_logs(branch_id: Optional[str] = None):
    # Fetch all completed treatments or completed appointments for branch
    try:
        query = supabase.table("appointments") \
            .select("*, patient:profiles!appointments_patient_id_fkey(first_name, last_name), dentist:profiles!appointments_dentist_id_fkey(first_name, last_name), branch:branches!appointments_branch_id_fkey(branch_name)") \
            .eq("status", "completed")
            
        if branch_id and branch_id != "All Branches" and branch_id != "all":
            query = query.eq("branch_id", branch_id)
            
        res = query.order("created_at", desc=True).execute()
            
        logs = res.data or []
        
        # Fetch billing services to map costs
        billing_res = supabase.table("billing_services").select("service_name, cost").execute()
        billing_map = {b['service_name'].lower(): b['cost'] for b in (billing_res.data or [])}
        
        for log in logs:
            service = log.get("service_requested", "")
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
    branch_id: Optional[str] = None

@router.post("/billing/upload")
async def upload_receipt(req: UploadReceiptRequest):
    try:
        branch_id = req.branch_id
        if not branch_id:
            p_res = supabase.table("profiles").select("branch_id").eq("id", req.patient_id).execute()
            if p_res.data and p_res.data[0].get("branch_id"):
                branch_id = p_res.data[0]["branch_id"]

        now_iso = datetime.utcnow().isoformat()
        new_invoice_res = supabase.table("invoices").insert({
            "patient_id": req.patient_id,
            "procedure_name": "General Consultation",
            "amount_due": req.amount,
            "status": "pending_verification",
            "receipt_url": req.receipt_url,
            "payment_method": req.payment_method,
            "branch_id": branch_id,
            "created_at": now_iso,
            "updated_at": now_iso
        }).execute()
        
        return new_invoice_res.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class CreateInvoiceRequest(BaseModel):
    patient_id: str
    procedure_name: str
    amount_due: float
    status: Optional[str] = "pending" # "pending" or "paid"
    payment_method: Optional[str] = None
    branch_id: Optional[str] = None
    is_installment: Optional[bool] = False
    months: Optional[int] = 1 # e.g. 3, 6, 12, 18, 24
    downpayment: Optional[float] = 0.0
    downpayment_paid: Optional[bool] = False
    downpayment_method: Optional[str] = None

@router.post("/billing/create")
async def create_invoice(req: CreateInvoiceRequest):
    try:
        branch_id = req.branch_id
        if not branch_id:
            p_res = supabase.table("profiles").select("branch_id").eq("id", req.patient_id).execute()
            if p_res.data and p_res.data[0].get("branch_id"):
                branch_id = p_res.data[0]["branch_id"]

        now_iso = datetime.utcnow().isoformat()

        # Handle Installment Plan creation
        if req.is_installment and req.months and req.months > 1:
            total_cost = float(req.amount_due)
            downpayment = float(req.downpayment or 0.0)
            remaining_balance = max(0.0, total_cost - downpayment)
            monthly_amount = round(remaining_balance / req.months, 2)
            plan_id = str(uuid.uuid4())
            invoices_to_insert = []

            # 1. Downpayment invoice (if applicable)
            if downpayment > 0:
                dp_data = {
                    "patient_id": req.patient_id,
                    "procedure_name": f"{req.procedure_name} (Downpayment)",
                    "amount_due": downpayment,
                    "status": "paid" if req.downpayment_paid else "pending",
                    "payment_method": req.downpayment_method if req.downpayment_paid else None,
                    "branch_id": branch_id,
                    "installment_number": 0,
                    "total_installments": req.months,
                    "parent_plan_id": plan_id,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "due_date": now_iso
                }
                if req.downpayment_paid:
                    dp_data["paid_at"] = now_iso
                invoices_to_insert.append(dp_data)

            # 2. Monthly Installment invoices
            for m in range(1, req.months + 1):
                due_dt = (datetime.utcnow() + timedelta(days=30 * m)).isoformat()
                inv_data = {
                    "patient_id": req.patient_id,
                    "procedure_name": f"{req.procedure_name} (Month {m} of {req.months})",
                    "amount_due": monthly_amount,
                    "status": "pending",
                    "payment_method": None,
                    "branch_id": branch_id,
                    "installment_number": m,
                    "total_installments": req.months,
                    "parent_plan_id": plan_id,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "due_date": due_dt
                }
                invoices_to_insert.append(inv_data)

            res = supabase.table("invoices").insert(invoices_to_insert).execute()
            return {"message": f"Installment plan created with {len(invoices_to_insert)} scheduled invoices", "invoices": res.data}

        # Standard Full Payment Bill creation
        insert_data = {
            "patient_id": req.patient_id,
            "procedure_name": req.procedure_name,
            "amount_due": req.amount_due,
            "status": req.status or "pending",
            "payment_method": req.payment_method,
            "branch_id": branch_id,
            "installment_number": 1,
            "total_installments": 1,
            "created_at": now_iso,
            "updated_at": now_iso
        }
        if req.status == "paid":
            insert_data["paid_at"] = now_iso

        res = supabase.table("invoices").insert(insert_data).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/billing/pending")
async def get_pending_billing(branch_id: Optional[str] = None):
    try:
        query = supabase.table("invoices") \
            .select("*, patient:profiles!invoices_patient_id_fkey(first_name, last_name, contact_number, branch_id), branch:branches!invoices_branch_id_fkey(id, branch_name)") \
            .eq("status", "pending_verification")
            
        if branch_id and branch_id != "All Branches" and branch_id != "all":
            query = query.eq("branch_id", branch_id)
            
        res = query.order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/billing/all")
async def get_all_billing(branch_id: Optional[str] = None):
    try:
        query = supabase.table("invoices") \
            .select("*, patient:profiles!invoices_patient_id_fkey(first_name, last_name, contact_number, branch_id), branch:branches!invoices_branch_id_fkey(id, branch_name)")
            
        if branch_id and branch_id != "All Branches" and branch_id != "all":
            query = query.eq("branch_id", branch_id)
            
        res = query.order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class VerifyBillingRequest(BaseModel):
    payment_method: Optional[str] = None

@router.post("/billing/verify/{record_id}")
async def verify_billing(record_id: str, req: VerifyBillingRequest = VerifyBillingRequest()):
    try:
        now_iso = datetime.utcnow().isoformat()
        update_data = {
            "status": "paid",
            "paid_at": now_iso,
            "updated_at": now_iso
        }
        if req.payment_method:
            update_data["payment_method"] = req.payment_method
            
        res = supabase.table("invoices").update(update_data).eq("id", record_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Invoice record not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
