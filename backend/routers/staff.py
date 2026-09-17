import os
import random
import string
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from services.db import supabase
import requests

router = APIRouter()

# ----------------- PATIENT DUPLICATE CHECK & CLINICAL METRICS -----------------

def _get_patient_clinical_summary(patient_id: str) -> Dict[str, Any]:
    """Helper to fetch full clinical and financial summary for a patient."""
    profile_res = supabase.table("profiles").select("*").eq("id", patient_id).execute()
    profile = profile_res.data[0] if (profile_res.data and len(profile_res.data) > 0) else {}

    email = None
    try:
        auth_user = supabase.auth.admin.get_user_by_id(patient_id)
        if auth_user and hasattr(auth_user, "user") and auth_user.user:
            email = auth_user.user.email
    except Exception:
        pass

    # Appointments
    app_res = supabase.table("appointments") \
        .select("id, appointment_date, status, notes, service_requested, dentist_id, dentist:profiles!appointments_dentist_id_fkey(first_name, last_name)") \
        .eq("patient_id", patient_id) \
        .order("appointment_date", desc=True) \
        .execute()
    appointments = app_res.data or []

    # Treatments
    treat_res = supabase.table("treatments") \
        .select("id, procedure_name, treatment_date, clinical_notes, created_at, dentist_id, dentist:profiles!treatments_dentist_id_fkey(first_name, last_name)") \
        .eq("patient_id", patient_id) \
        .order("created_at", desc=True) \
        .execute()
    treatments = treat_res.data or []

    # Tooth conditions
    tooth_res = supabase.table("tooth_conditions") \
        .select("id, tooth_number, status, notes") \
        .eq("patient_id", patient_id) \
        .order("tooth_number", desc=False) \
        .execute()
    tooth_conditions = tooth_res.data or []

    # Invoices
    inv_res = supabase.table("invoices") \
        .select("id, procedure_name, amount_due, status, payment_method, created_at, paid_at") \
        .eq("patient_id", patient_id) \
        .order("created_at", desc=True) \
        .execute()
    invoices = inv_res.data or []

    total_invoiced = sum(float(i.get("amount_due") or 0) for i in invoices)
    total_paid = sum(float(i.get("amount_due") or 0) for i in invoices if (i.get("status") or "").lower() == "paid")
    unpaid_balance = total_invoiced - total_paid

    # Prescriptions
    presc_res = supabase.table("prescriptions") \
        .select("id, medication_name, dosage_instructions, start_date, is_active, created_at") \
        .eq("patient_id", patient_id) \
        .order("created_at", desc=True) \
        .execute()
    prescriptions = presc_res.data or []

    # Medical History
    med_res = supabase.table("medical_histories") \
        .select("id, allergies, underlying_conditions, intraoral_screening, consultation_reason") \
        .eq("patient_id", patient_id) \
        .execute()
    has_med = bool(med_res.data and len(med_res.data) > 0)
    medical_history = med_res.data[0] if has_med else None

    return {
        "profile": profile,
        "email": email,
        "appointments_count": len(appointments),
        "appointments": appointments[:5],
        "treatments_count": len(treatments),
        "treatments": treatments[:5],
        "teeth_count": len(tooth_conditions),
        "tooth_conditions": tooth_conditions,
        "invoices_count": len(invoices),
        "total_invoiced": total_invoiced,
        "total_paid": total_paid,
        "unpaid_balance": unpaid_balance,
        "invoices": invoices[:5],
        "prescriptions_count": len(prescriptions),
        "prescriptions": prescriptions[:5],
        "has_medical_history": has_med,
        "medical_history": medical_history,
        "total_clinical_records": len(appointments) + len(treatments) + len(tooth_conditions) + len(invoices) + len(prescriptions)
    }

@router.get("/patients/dismissed-duplicates")
async def get_dismissed_duplicates():
    try:
        res = supabase.table("dismissed_patient_duplicates").select("patient_id_1, patient_id_2, reason, created_at").execute()
        return res.data or []
    except Exception as e:
        print("Error fetching dismissed duplicates:", e)
        return []

@router.get("/patients/{patient_id}/duplicate-details")
async def get_patient_duplicate_details(patient_id: str):
    try:
        target_summary = _get_patient_clinical_summary(patient_id)
        if not target_summary.get("profile") or not target_summary["profile"].get("id"):
            raise HTTPException(status_code=404, detail="Patient profile not found.")

        target_profile = target_summary["profile"]
        first_name = (target_profile.get("first_name") or "").strip()
        last_name = (target_profile.get("last_name") or "").strip()
        phone = (target_profile.get("contact_number") or "").strip()
        clean_phone = "".join(filter(str.isdigit, phone)) if phone else ""
        dob = (target_profile.get("date_of_birth") or "").strip()

        # Fetch dismissed duplicate pairs
        dismissed_set = set()
        try:
            dismissed_res = supabase.table("dismissed_patient_duplicates").select("patient_id_1, patient_id_2").execute()
            for d in (dismissed_res.data or []):
                dismissed_set.add((d["patient_id_1"], d["patient_id_2"]))
                dismissed_set.add((d["patient_id_2"], d["patient_id_1"]))
        except Exception:
            pass

        # Fetch all other patient profiles
        all_res = supabase.table("profiles").select("*").eq("role", "patient").neq("id", patient_id).execute()
        all_patients = all_res.data or []

        candidates = []
        for p in all_patients:
            p_id = p["id"]
            if (patient_id, p_id) in dismissed_set:
                continue

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
                else:
                    reasons.append("Similar full name")
                    if confidence == "low":
                        confidence = "medium"
            elif exact_last and dob and p_dob and dob == p_dob:
                reasons.append(f"Matching last name & Date of Birth ({p_dob})")
                confidence = "medium"

            if reasons:
                candidate_summary = _get_patient_clinical_summary(p_id)
                candidates.append({
                    **candidate_summary,
                    "confidence": confidence,
                    "reasons": reasons
                })

        confidence_order = {"high": 0, "medium": 1, "low": 2}
        candidates.sort(key=lambda m: (confidence_order.get(m["confidence"], 3), -m["total_clinical_records"]))

        return {
            "target_patient": target_summary,
            "candidates": candidates
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting duplicate details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class MergePatientsRequest(BaseModel):
    primary_patient_id: str
    secondary_patient_id: str
    demographics_to_keep: Optional[Dict[str, Any]] = None

@router.post("/patients/merge")
async def merge_patients(req: MergePatientsRequest):
    primary_id = req.primary_patient_id
    secondary_id = req.secondary_patient_id

    if primary_id == secondary_id:
        raise HTTPException(status_code=400, detail="Primary and Secondary patient IDs cannot be identical.")

    try:
        demos = req.demographics_to_keep or {}
        rpc_res = supabase.rpc("rpc_merge_patients", {
            "p_primary_id": primary_id,
            "p_secondary_id": secondary_id,
            "p_contact_number": demos.get("contact_number"),
            "p_date_of_birth": demos.get("date_of_birth"),
            "p_gender": demos.get("gender")
        }).execute()

        # Delete secondary auth user if one exists
        try:
            supabase.auth.admin.delete_user(secondary_id)
        except Exception as auth_err:
            print(f"Auth user delete ignored for unlinked account: {auth_err}")

        return rpc_res.data or {
            "success": True,
            "message": "Patient records successfully merged without data loss.",
            "primary_patient_id": primary_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error merging patients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to merge patient records: {str(e)}")

class DismissDuplicateRequest(BaseModel):
    patient_id_1: str
    patient_id_2: str
    reason: Optional[str] = "Marked as distinct patient records by clinic staff"

@router.post("/patients/dismiss-duplicate")
async def dismiss_patient_duplicate(req: DismissDuplicateRequest):
    p1 = req.patient_id_1
    p2 = req.patient_id_2
    if p1 == p2:
        raise HTTPException(status_code=400, detail="Cannot dismiss a record against itself.")

    try:
        rpc_res = supabase.rpc("rpc_dismiss_duplicate", {
            "p1": p1,
            "p2": p2,
            "p_reason": req.reason or "Dismissed by staff"
        }).execute()
        return rpc_res.data or {"success": True, "message": "Duplicate warning dismissed successfully."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error dismissing duplicate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to dismiss duplicate: {str(e)}")

class DeleteEmptyDuplicateRequest(BaseModel):
    patient_id: str

@router.post("/patients/delete-empty-duplicate")
async def delete_empty_duplicate(req: DeleteEmptyDuplicateRequest):
    patient_id = req.patient_id
    try:
        rpc_res = supabase.rpc("rpc_delete_empty_duplicate", {
            "p_patient_id": patient_id
        }).execute()

        try:
            supabase.auth.admin.delete_user(patient_id)
        except Exception:
            pass

        return rpc_res.data or {"success": True, "message": "Empty duplicate record deleted cleanly."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting empty duplicate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete record: {str(e)}")

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

        return {
            "message": "Patient created successfully",
            "patient_id": patient_id,
            "temporary_password": password if create_portal else None,
            "email": email if create_portal else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create patient: {str(e)}")


@router.get("/patients")
async def get_patients():
    try:
        res = supabase.table("profiles") \
            .select("id, first_name, last_name, nickname, date_of_birth, gender, contact_number, is_email_verified, created_at, branch_id") \
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
    tomorrow_start = (datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()
    try:
        query = supabase.table("appointments") \
            .select("*, patient:profiles!appointments_patient_id_fkey(first_name, last_name, contact_number, is_email_verified), dentist:profiles!appointments_dentist_id_fkey(first_name, last_name)") \
            .in_("status", ["waiting", "in_progress", "completed", "cancelled"]) \
            .or_(f"checked_in_at.gte.{today_start},created_at.gte.{today_start},and(appointment_date.gte.{today_start},appointment_date.lt.{tomorrow_start})")
            
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
    now_iso = datetime.utcnow().isoformat()
    try:
        res = supabase.table("appointments").insert({
            "patient_id": req.patient_id,
            "dentist_id": req.dentist_id,
            "appointment_date": now_iso,
            "checked_in_at": now_iso,
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

# ----------------- CLINICAL & OPERATIONAL REPORTS -----------------

@router.get("/reports/daily-summary")
async def get_daily_clinical_summary(branch_id: Optional[str] = None, target_date: Optional[str] = None):
    """
    Returns today's (or target date's) full patient roster and procedure breakdown.
    """
    try:
        date_str = target_date or datetime.utcnow().strftime("%Y-%m-%d")
        day_start = f"{date_str}T00:00:00"
        day_end = f"{date_str}T23:59:59"

        query = supabase.table("appointments") \
            .select("*, patient:profiles!appointments_patient_id_fkey(first_name, last_name, contact_number), dentist:profiles!appointments_dentist_id_fkey(first_name, last_name), branch:branches!appointments_branch_id_fkey(id, branch_name)") \
            .gte("appointment_date", day_start) \
            .lte("appointment_date", day_end)

        if branch_id and branch_id != "all" and branch_id != "All Branches":
            if "-" in branch_id:
                query = query.eq("branch_id", branch_id)
            else:
                b_res = supabase.table("branches").select("id").ilike("branch_name", f"%{branch_id.replace('Branch','').strip()}%").execute()
                if b_res.data:
                    query = query.eq("branch_id", b_res.data[0]["id"])

        res = query.order("appointment_date").execute()
        appointments = res.data or []

        # Fetch billing services to map procedure costs
        billing_res = supabase.table("billing_services").select("service_name, cost").execute()
        billing_map = {b['service_name'].lower(): b['cost'] for b in (billing_res.data or [])}

        proc_counts = {}
        for a in appointments:
            svc = a.get("service_requested") or "General Consultation"
            cost = billing_map.get(svc.lower(), 500)
            if svc not in proc_counts:
                proc_counts[svc] = {"count": 0, "total_fee": 0}
            proc_counts[svc]["count"] += 1
            proc_counts[svc]["total_fee"] += cost

        status_counts = {
            "total": len(appointments),
            "waiting": sum(1 for a in appointments if a.get("status") == "waiting"),
            "in_progress": sum(1 for a in appointments if a.get("status") == "in_progress"),
            "completed": sum(1 for a in appointments if a.get("status") == "completed"),
            "scheduled": sum(1 for a in appointments if a.get("status") == "scheduled"),
            "pending": sum(1 for a in appointments if a.get("status") == "pending"),
            "cancelled": sum(1 for a in appointments if a.get("status") == "cancelled")
        }

        return {
            "date": date_str,
            "branch_id": branch_id,
            "appointments": appointments,
            "procedure_breakdown": [{"procedure_name": k, "count": v["count"], "estimated_fee": v["total_fee"]} for k, v in proc_counts.items()],
            "status_summary": status_counts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------- VISIT LOGS -----------------

@router.get("/visit-logs")
async def get_visit_logs(branch_id: Optional[str] = None):
    # Fetch all completed treatments or completed appointments for branch
    try:
        query = supabase.table("appointments") \
            .select("*, patient:profiles!appointments_patient_id_fkey(first_name, last_name, contact_number, date_of_birth), dentist:profiles!appointments_dentist_id_fkey(first_name, last_name), branch:branches!appointments_branch_id_fkey(id, branch_name)") \
            .eq("status", "completed")
            
        if branch_id and branch_id != "All Branches" and branch_id != "all":
            if "-" in branch_id:
                query = query.eq("branch_id", branch_id)
            else:
                b_res = supabase.table("branches").select("id").ilike("branch_name", f"%{branch_id.replace('Branch','').strip()}%").execute()
                if b_res.data:
                    query = query.eq("branch_id", b_res.data[0]["id"])
            
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
