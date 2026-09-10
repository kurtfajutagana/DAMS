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
                    frontend_base = os.getenv("FRONTEND_URL", "https://teethtalk.vercel.app").rstrip("/")
                    confirm_url = f"{frontend_base}/patient/dashboard?confirm_dose={r['id']}"
                    
                    if brevo_api_key and user_email:
                        html_content = f'''
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                            <div style="text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 16px; margin-bottom: 20px;">
                                <h2 style="color: #dc2626; margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Teeth Talk Dental Clinic</h2>
                                <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Automated Patient Care & Medication Reminder Engine</p>
                            </div>
                            
                            <h3 style="color: #0f172a; font-size: 18px; margin-bottom: 8px;">Prescription Intake Reminder</h3>
                            <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hi <strong>{patient_name}</strong>,</p>
                            <p style="color: #334155; font-size: 15px; line-height: 1.5;">This is an automated reminder to take your scheduled dose of: <strong style="color: #dc2626;">{meds}</strong>.</p>
                            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Please follow the dosage instructions provided by your attending dentist to ensure optimal recovery.</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{confirm_url}" style="background-color: #16a34a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                    ✓ I Have Taken This Dose (Confirm Intake)
                                </a>
                                <p style="color: #94a3b8; font-size: 11px; margin-top: 10px;">Clicking confirms your dose and updates your recovery compliance record.</p>
                            </div>
                            
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">If you have any questions or experience adverse symptoms, please contact Teeth Talk Dental Clinic directly.</p>
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
                            "subject": f"⏰ Time to take your medication: {meds} - Teeth Talk",
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
                                "title": "Medication Reminder ⏰",
                                "message": f"It's time to take your medication: {meds}. Please confirm after taking your dose."
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
    patient_adherence_records with the calculated risk probability based on real intake confirmations.
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
        patient_id = str(r["patient_id"])
        
        # Calculate real reminder metrics for this patient from reminders table
        try:
            rem_res = supabase.table("reminders").select("status, scheduled_time, sent_at").eq("patient_id", patient_id).execute()
            reminders_data = rem_res.data or []
            
            total_sent = sum(1 for rem in reminders_data if rem.get("status") in ["sent", "taken"])
            total_taken = sum(1 for rem in reminders_data if rem.get("status") == "taken")
            
            # Missed reminders = reminders sent that were never confirmed as taken
            missed_reminders = max(0, total_sent - total_taken)
            
            # Check chatbot usage count from chatbot_logs
            chat_res = supabase.table("chatbot_logs").select("id", count="exact").eq("patient_id", patient_id).execute()
            chatbot_inquiries = chat_res.count if hasattr(chat_res, "count") and chat_res.count is not None else 3
            
            # Check days since last treatment/visit
            tr_res = supabase.table("treatments").select("treatment_date").eq("patient_id", patient_id).order("treatment_date", desc=True).limit(1).execute()
            if tr_res.data and len(tr_res.data) > 0:
                last_dt = datetime.strptime(tr_res.data[0]["treatment_date"], "%Y-%m-%d")
                days_since_last_visit = max(0, (datetime.utcnow() - last_dt).days)
            else:
                days_since_last_visit = 14
        except Exception as metric_err:
            logger.warning(f"Error compiling metrics for patient {patient_id}: {metric_err}")
            missed_reminders = 0
            days_since_last_visit = 14
            chatbot_inquiries = 3
        
        features = pd.DataFrame([{
            'missed_reminders': missed_reminders,
            'days_since_last_visit': days_since_last_visit,
            'chatbot_inquiries': chatbot_inquiries
        }])
        
        prob = adherence_model.predict_proba(features)[0][1] # Probability of High Risk
        risk_score_percent = int(prob * 100)
        
        # If patient has confirmed all recent doses, ensure low risk
        if missed_reminders == 0:
            risk_score_percent = min(risk_score_percent, 15)
            status = "likely"
        else:
            status = "high_risk" if prob > 0.5 else "likely"
        
        supabase.table("patient_adherence_records").update({
            "risk_score": risk_score_percent,
            "status": status
        }).eq("id", r["id"]).execute()
        
    logger.info(f"Updated adherence risk scores for {len(records)} records.")

def start_reminder_engine():
    asyncio.create_task(process_reminders())
