import asyncio
from datetime import datetime
import logging
import joblib
import pandas as pd
import os
from services.db import supabase

logger = logging.getLogger("reminder_engine")
logging.basicConfig(level=logging.INFO)

# Global cache for adherence ML model
adherence_model = None

async def process_reminders():
    """
    Background worker that runs periodically to check for pending reminders
    and dispatches them (simulating SMS/Email sending).
    """
    logger.info("Automated Reminder Engine started.")
    
    while True:
        try:
            now_iso = datetime.utcnow().isoformat()
            
            # Fetch pending reminders that are due
            # Since reminders doesn't have a direct FK to profiles, we fetch through prescriptions
            res = supabase.table("reminders") \
                .select("*, prescriptions(medication_name, dosage_instructions, patient_id)") \
                .eq("status", "pending") \
                .lte("scheduled_time", now_iso) \
                .execute()
                
            reminders = res.data
            
            if reminders:
                logger.info(f"Found {len(reminders)} pending reminders to process.")
                
                for r in reminders:
                    patient_name = "Patient"
                    contact = "Unknown"
                    meds = r.get("prescriptions", {}).get("medication_name", "your medication")
                    patient_id = r.get("prescriptions", {}).get("patient_id")
                    
                    if patient_id:
                        # Fetch profile separately
                        prof_res = supabase.table("profiles").select("first_name, contact_number").eq("id", patient_id).execute()
                        if prof_res.data:
                            patient_name = prof_res.data[0].get("first_name", "Patient")
                            contact = prof_res.data[0].get("contact_number", "Unknown")
                    
                    # SIMULATE SMS SENDING
                    logger.info(f"[SMS DISPATCH] To: {contact} | Message: Hi {patient_name}, this is an automated reminder from Teeth Talk Clinic to take {meds}.")
                    
                    # Update status to sent
                    supabase.table("reminders").update({
                        "status": "sent",
                        "sent_at": datetime.utcnow().isoformat()
                    }).eq("id", r["id"]).execute()
            
        except Exception as e:
            logger.error(f"Error processing reminders: {e}")
            
        # Also run Adherence Risk ML Model
        try:
            calculate_adherence_risks()
        except Exception as e:
            logger.error(f"Error calculating adherence risks: {e}")
            
        # Run every 60 seconds
        await asyncio.sleep(60)

def calculate_adherence_risks():
    """
    Loads the trained Adherence Logistic Regression Model and updates
    patient_adherence_records with the calculated risk probability.
    """
    global adherence_model
    
    if adherence_model is None:
        model_path = os.path.join(os.path.dirname(__file__), "..", "ml", "models", "best_adherence_model.joblib")
        if not os.path.exists(model_path):
            logger.warning("Adherence ML model not found. Skipping risk calculation.")
            return
            
        adherence_model = joblib.load(model_path)
    
    # Fetch all adherence records
    res = supabase.table("patient_adherence_records").select("*").execute()
    records = res.data
    
    if not records:
        return
        
    for r in records:
        # Mock features: in a real app, query database to aggregate missed_reminders, etc.
        # For this prototype, we'll randomize or extract from db if available
        # We will use 'risk_score' to store the predicted percentage.
        # Assuming the table has no raw feature columns, we'll generate features based on ID to simulate it.
        # In production: missed = query_missed_reminders(r['patient_id'])
        
        # We simulate the features for demonstration purposes
        patient_id = str(r["patient_id"])
        missed_reminders = (hash(patient_id) % 10) # 0 to 9
        days_since_last_visit = (hash(patient_id + "days") % 100) # 0 to 99
        chatbot_inquiries = (hash(patient_id + "chat") % 20) # 0 to 19
        
        features = pd.DataFrame([{
            'missed_reminders': missed_reminders,
            'days_since_last_visit': days_since_last_visit,
            'chatbot_inquiries': chatbot_inquiries
        }])
        
        prob = adherence_model.predict_proba(features)[0][1] # Probability of High Risk
        risk_score_percent = int(prob * 100)
        
        status = "high_risk" if prob > 0.5 else "likely"
        
        supabase.table("patient_adherence_records").update({
            "risk_score": risk_score_percent,
            "status": status
        }).eq("id", r["id"]).execute()
        
    logger.info(f"Updated adherence risk scores for {len(records)} records.")

def start_reminder_engine():
    asyncio.create_task(process_reminders())
