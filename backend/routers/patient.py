from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from services.db import supabase

router = APIRouter(
    tags=["Patient Medication & Adherence"]
)

class ConfirmDoseRequest(BaseModel):
    notes: Optional[str] = None

class LogDoseRequest(BaseModel):
    patient_id: Optional[str] = None
    notes: Optional[str] = None

@router.get("/reminders/{patient_id}")
def get_patient_reminders(patient_id: str):
    """
    Fetches active prescriptions and due/recent reminder doses for a patient.
    """
    try:
        # 1. Fetch active prescriptions
        rx_res = supabase.table("prescriptions") \
            .select("*, profiles!prescriptions_dentist_id_fkey(first_name, last_name)") \
            .eq("patient_id", patient_id) \
            .eq("is_active", True) \
            .order("start_date", desc=True) \
            .execute()
        prescriptions = rx_res.data or []

        # 2. Fetch reminders for this patient
        rem_res = supabase.table("reminders") \
            .select("*, prescriptions(medication_name, dosage_instructions)") \
            .eq("patient_id", patient_id) \
            .order("scheduled_time", desc=True) \
            .limit(20) \
            .execute()
        reminders = rem_res.data or []

        # 3. Fetch patient adherence summary
        adh_res = supabase.table("patient_adherence_records") \
            .select("*") \
            .eq("patient_id", patient_id) \
            .maybeSingle() \
            .execute()
        adherence = adh_res.data if adh_res else None

        # Compute taken vs pending stats
        taken_count = sum(1 for r in reminders if r.get("status") == "taken")
        total_reminders = len(reminders)
        compliance_rate = int((taken_count / total_reminders * 100)) if total_reminders > 0 else 100

        return {
            "prescriptions": prescriptions,
            "reminders": reminders,
            "adherence": adherence,
            "stats": {
                "total_doses": total_reminders,
                "doses_taken": taken_count,
                "compliance_rate": compliance_rate,
                "status": adherence.get("status", "likely") if adherence else "likely",
                "risk_score": adherence.get("risk_score", 10) if adherence else 10
            }
        }
    except Exception as e:
        print(f"Error fetching patient reminders: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reminders/{reminder_id}/confirm")
def confirm_reminder_dose(reminder_id: str, req: Optional[ConfirmDoseRequest] = None):
    """
    Marks a scheduled dose reminder as taken and decreases the patient's adherence risk score.
    """
    now_iso = datetime.utcnow().isoformat() + "Z"
    try:
        # 1. Fetch reminder to identify patient & medication
        r_res = supabase.table("reminders") \
            .select("*, prescriptions(medication_name, dosage_instructions, patient_id)") \
            .eq("id", reminder_id) \
            .execute()
        
        if not r_res.data or len(r_res.data) == 0:
            raise HTTPException(status_code=404, detail="Reminder record not found")

        reminder = r_res.data[0]
        patient_id = reminder.get("patient_id") or reminder.get("prescriptions", {}).get("patient_id")
        med_name = reminder.get("prescriptions", {}).get("medication_name", "Medication")

        # 2. Update reminder status to taken
        supabase.table("reminders").update({
            "status": "taken",
            "sent_at": reminder.get("sent_at") or now_iso
        }).eq("id", reminder_id).execute()

        # 3. Reduce patient adherence risk score & promote to 'likely to comply'
        if patient_id:
            try:
                # Check if record exists
                adh_check = supabase.table("patient_adherence_records").select("id, risk_score").eq("patient_id", patient_id).execute()
                if adh_check.data and len(adh_check.data) > 0:
                    current_risk = adh_check.data[0].get("risk_score", 50)
                    new_risk = max(5, current_risk - 25) # Drop risk score significantly
                    supabase.table("patient_adherence_records").update({
                        "risk_score": new_risk,
                        "status": "likely"
                    }).eq("patient_id", patient_id).execute()
                else:
                    # Insert fresh low-risk record
                    supabase.table("patient_adherence_records").insert({
                        "patient_id": patient_id,
                        "risk_score": 10,
                        "status": "likely",
                        "procedure_type": "Post-Treatment Recovery"
                    }).execute()
            except Exception as adh_err:
                print(f"Error updating adherence score: {adh_err}")

            # 4. Insert in-app notification confirming the dose
            try:
                supabase.table("notifications").insert({
                    "patient_id": patient_id,
                    "title": "Dose Confirmed ✓",
                    "message": f"Recorded your intake for {med_name}. Great job staying on track with your recovery!"
                }).execute()
            except Exception as notif_err:
                print(f"Error inserting confirmation notification: {notif_err}")

        return {
            "message": "Dose successfully confirmed!",
            "status": "taken",
            "taken_at": now_iso,
            "medication": med_name
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error confirming reminder: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/prescriptions/{prescription_id}/log-dose")
def log_prescription_dose(prescription_id: str, req: Optional[LogDoseRequest] = None):
    """
    Directly logs a confirmed dose from an active prescription card.
    """
    now_iso = datetime.utcnow().isoformat() + "Z"
    try:
        # Fetch prescription details
        rx_res = supabase.table("prescriptions").select("*").eq("id", prescription_id).execute()
        if not rx_res.data or len(rx_res.data) == 0:
            raise HTTPException(status_code=404, detail="Prescription not found")
            
        rx = rx_res.data[0]
        actual_patient_id = (req.patient_id if req and req.patient_id else None) or rx.get("patient_id")
        med_name = rx.get("medication_name", "Prescribed Medication")

        # Create a confirmed reminder entry
        supabase.table("reminders").insert({
            "prescription_id": prescription_id,
            "patient_id": actual_patient_id,
            "scheduled_time": now_iso,
            "status": "taken",
            "sent_at": now_iso
        }).execute()

        # Update adherence risk
        if actual_patient_id:
            try:
                adh_check = supabase.table("patient_adherence_records").select("id, risk_score").eq("patient_id", actual_patient_id).execute()
                if adh_check.data and len(adh_check.data) > 0:
                    current_risk = adh_check.data[0].get("risk_score", 50)
                    new_risk = max(5, current_risk - 25)
                    supabase.table("patient_adherence_records").update({
                        "risk_score": new_risk,
                        "status": "likely"
                    }).eq("patient_id", actual_patient_id).execute()
                else:
                    supabase.table("patient_adherence_records").insert({
                        "patient_id": actual_patient_id,
                        "risk_score": 10,
                        "status": "likely",
                        "procedure_type": "Post-Treatment Recovery"
                    }).execute()
            except Exception as err:
                print(f"Adherence record update err: {err}")

            try:
                supabase.table("notifications").insert({
                    "patient_id": actual_patient_id,
                    "title": "Dose Confirmed ✓",
                    "message": f"Successfully logged your dose of {med_name}."
                }).execute()
            except Exception:
                pass

        return {
            "message": f"Dose for {med_name} confirmed successfully!",
            "status": "taken",
            "taken_at": now_iso
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error logging dose: {e}")
        raise HTTPException(status_code=500, detail=str(e))
