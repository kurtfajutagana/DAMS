import asyncio
from datetime import datetime
import logging
import joblib
import pandas as pd
import os
import requests
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
            now_iso = datetime.utcnow().isoformat() + "Z"
            
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
                            
                        # Fetch user email from Supabase Auth
                        user_email = None
                        try:
                            user_res = supabase.auth.admin.get_user_by_id(patient_id)
                            user_email = user_res.user.email
                        except Exception as auth_err:
                            logger.error(f"Failed to fetch user email for patient {patient_id}: {auth_err}")

                    # 1. SEND EMAIL VIA BREVO
                    brevo_api_key = os.getenv("BREVO_API_KEY")
                    brevo_from_email = os.getenv("BREVO_FROM_EMAIL", "dams.no.reply@gmail.com")
                    
                    if brevo_api_key and user_email:
                        html_content = f'''
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                            <h2 style="color: #2563eb; text-align: center;">Teeth Talk Dental Clinic</h2>
                            <h3 style="color: #1f2937;">Medication Reminder</h3>
                            <p style="color: #4b5563; font-size: 16px;">Hi {patient_name},</p>
                            <p style="color: #4b5563; font-size: 16px;">This is an automated reminder to take your prescribed medication: <strong>{meds}</strong>.</p>
                            <p style="color: #4b5563; font-size: 16px;">Please follow the dosage instructions provided by your dentist.</p>
                            <br/>
                            <p style="color: #9ca3af; font-size: 14px; text-align: center;">If you have any questions, feel free to reply to this email or contact the clinic.</p>
                        </div>
                        '''
                        url = "https://api.brevo.com/v3/smtp/email"
                        headers = {
                            "accept": "application/json",
                            "api-key": brevo_api_key,
                            "content-type": "application/json"
                        }
                        payload = {
                            "sender": {"email": brevo_from_email, "name": "Teeth Talk Clinic"},
                            "to": [{"email": user_email}],
                            "subject": "Time to take your medication - Teeth Talk Clinic",
                            "htmlContent": html_content
                        }
                        try:
                            brevo_res = requests.post(url, json=payload, headers=headers)
                            brevo_res.raise_for_status()
                            logger.info(f"Successfully sent email reminder to {user_email}")
                        except Exception as e:
                            logger.error(f"Failed to send email via Brevo: {e}")
                    else:
                        logger.warning(f"Could not send email. Brevo key or user email missing (Email: {user_email})")

                    # 2. INSERT APP NOTIFICATION
                    if patient_id:
                        try:
                            supabase.table("notifications").insert({
                                "patient_id": patient_id,
                                "title": "Medication Reminder",
                                "message": f"It's time to take your medication: {meds}."
                            }).execute()
                        except Exception as db_err:
                            logger.error(f"Failed to insert notification: {db_err}")
                    
                    # 3. Update status to sent
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
