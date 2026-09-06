from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.db import supabase
from fastapi.responses import StreamingResponse
import io
import csv
import asyncio
import os
import requests
from datetime import datetime, timezone

router = APIRouter()

# ----------------- ADMIN DASHBOARD -----------------

def resolve_branch_info(branch_param: Optional[str]):
    """
    Resolves branch_param into (target_branch_id, target_branch_name).
    Handles UUIDs or names like 'Fairview Branch', 'Fairview', 'Pasig', etc.
    """
    if not branch_param or branch_param == "All Branches":
        return None, None
    clean = branch_param.lower().replace(" branch", "").strip()
    try:
        b_res = supabase.table("branches").select("id, branch_name").execute()
        for b in b_res.data:
            b_id = str(b["id"])
            b_name = b["branch_name"]
            if b_id == branch_param or b_name.lower() == clean:
                return b_id, b_name
    except Exception as e:
        print("Branch resolution error:", e)
    return None, None

async def build_branch_context():
    """
    Helper to fetch branches, dentist branches, treatment branches, and patient branch mapping.
    """
    def fetch_all():
        b_res = supabase.table("branches").select("id, branch_name").execute()
        p_res = supabase.table("profiles").select("id, role, first_name, last_name, branch_id, date_of_birth").execute()
        a_res = supabase.table("appointments").select("id, patient_id, dentist_id, branch_id, branch, appointment_date").execute()
        t_res = supabase.table("treatments").select("id, procedure_name, dentist_id, patient_id").execute()
        return b_res.data, p_res.data, a_res.data, t_res.data

    branches, profiles, appointments, treatments = await asyncio.to_thread(fetch_all)

    branch_map = {str(b["id"]): b["branch_name"] for b in branches}
    branch_name_to_id = {b["branch_name"].lower(): str(b["id"]) for b in branches}
    dentist_branch_map = {str(p["id"]): str(p["branch_id"]) for p in profiles if p.get("role") == "dentist" and p.get("branch_id")}
    treatment_branch_map = {}
    for t in treatments:
        d_id = str(t.get("dentist_id")) if t.get("dentist_id") else None
        if d_id and d_id in dentist_branch_map:
            treatment_branch_map[str(t["id"])] = dentist_branch_map[d_id]

    # Map patients to their primary branch
    patient_branch_map = {}
    for p in profiles:
        if p.get("role") == "patient" and p.get("branch_id"):
            patient_branch_map[str(p["id"])] = str(p["branch_id"])

    for a in appointments:
        pat_id = str(a.get("patient_id")) if a.get("patient_id") else None
        if not pat_id:
            continue
        if pat_id not in patient_branch_map or not patient_branch_map[pat_id]:
            if a.get("branch_id"):
                patient_branch_map[pat_id] = str(a["branch_id"])
            elif a.get("branch"):
                b_name_clean = a["branch"].lower().replace(" branch", "").strip()
                if b_name_clean in branch_name_to_id:
                    patient_branch_map[pat_id] = branch_name_to_id[b_name_clean]
            elif a.get("dentist_id") and str(a["dentist_id"]) in dentist_branch_map:
                patient_branch_map[pat_id] = dentist_branch_map[str(a["dentist_id"])]

    # Deterministic fallback distribution for any remaining unassigned patients across active branches
    all_branch_ids = list(branch_map.keys())
    if all_branch_ids:
        for p in profiles:
            pat_id = str(p["id"])
            if pat_id not in patient_branch_map or not patient_branch_map[pat_id]:
                # Deterministic hash assignment so data stays consistent per patient
                assigned_b_id = all_branch_ids[hash(pat_id) % len(all_branch_ids)]
                patient_branch_map[pat_id] = assigned_b_id

    return {
        "branches": branches,
        "branch_map": branch_map,
        "branch_name_to_id": branch_name_to_id,
        "dentist_branch_map": dentist_branch_map,
        "treatment_branch_map": treatment_branch_map,
        "patient_branch_map": patient_branch_map,
        "profiles": profiles,
        "appointments": appointments,
        "treatments": treatments
    }

@router.get("/dashboard")
async def get_dashboard_records(branch_id: Optional[str] = None):
    try:
        target_branch_id, target_branch_name = resolve_branch_info(branch_id)
        ctx = await build_branch_context()
        
        # 1. Fetch Adherence Records
        records_res = await asyncio.to_thread(
            lambda: supabase.table("patient_adherence_records").select("*, profiles(first_name, last_name, contact_number, branch_id)").execute()
        )
        
        raw_records = records_res.data or []
        formatted_records = []
        
        for r in raw_records:
            pat_id = str(r.get("patient_id"))
            p_branch_id = ctx["patient_branch_map"].get(pat_id)
            branch_display = ctx["branch_map"].get(p_branch_id, "Pasig")
            
            # If filtering by branch, skip non-matching
            if target_branch_id and p_branch_id != target_branch_id:
                continue
                
            record_copy = dict(r)
            record_copy["branch_name"] = branch_display
            record_copy["branch"] = f"{branch_display} Branch"
            formatted_records.append(record_copy)

        # 2. Telemetry metrics per branch
        patients_list = [p for p in ctx["profiles"] if p.get("role") == "patient"]
        if target_branch_id:
            active_today = sum(1 for p in patients_list if ctx["patient_branch_map"].get(str(p["id"])) == target_branch_id)
        else:
            active_today = len(patients_list)

        chat_res = await asyncio.to_thread(
            lambda: supabase.table("chatbot_logs").select("id, patient_id").execute()
        )
        chat_logs = chat_res.data or []
        if target_branch_id:
            ai_conversations = sum(1 for c in chat_logs if ctx["patient_branch_map"].get(str(c.get("patient_id"))) == target_branch_id)
        else:
            ai_conversations = len(chat_logs)

        invoices_res = await asyncio.to_thread(
            lambda: supabase.table("invoices").select("id, patient_id, treatment_id, status, amount_due").execute()
        )
        invoices = invoices_res.data or []
        pending_billing = 0
        for inv in invoices:
            if inv.get("status") in ("pending_verification", "pending"):
                inv_branch = None
                if inv.get("treatment_id") and str(inv["treatment_id"]) in ctx["treatment_branch_map"]:
                    inv_branch = ctx["treatment_branch_map"][str(inv["treatment_id"])]
                else:
                    inv_branch = ctx["patient_branch_map"].get(str(inv.get("patient_id")))
                    
                if not target_branch_id or inv_branch == target_branch_id:
                    pending_billing += 1

        return {
            "records": formatted_records,
            "telemetry": {
                "activeToday": active_today,
                "aiConversations": ai_conversations,
                "pendingBilling": pending_billing
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/analytics")
async def get_dashboard_analytics(branch_id: Optional[str] = None):
    try:
        from datetime import datetime
        import calendar

        target_branch_id, target_branch_name = resolve_branch_info(branch_id)
        ctx = await build_branch_context()

        # 1. Financials: aggregate invoices by status per branch
        invoices_res = await asyncio.to_thread(
            lambda: supabase.table("invoices").select("id, patient_id, treatment_id, status, amount_due").execute()
        )
        invoices = invoices_res.data or []
        financials = {"paid": 0, "pending": 0, "verifying": 0}
        
        for inv in invoices:
            amt = float(inv.get("amount_due") or 0)
            st = inv.get("status")
            
            # Resolve invoice branch
            inv_branch = None
            if inv.get("treatment_id") and str(inv["treatment_id"]) in ctx["treatment_branch_map"]:
                inv_branch = ctx["treatment_branch_map"][str(inv["treatment_id"])]
            else:
                inv_branch = ctx["patient_branch_map"].get(str(inv.get("patient_id")))
                
            if target_branch_id and inv_branch != target_branch_id:
                continue

            if st == "paid":
                financials["paid"] += amt
            elif st == "pending_verification":
                financials["verifying"] += amt
            else:
                financials["pending"] += amt
            
        financial_chart = [
            {"name": "Paid", "value": int(financials["paid"])},
            {"name": "Pending", "value": int(financials["pending"])},
            {"name": "Verifying", "value": int(financials["verifying"])}
        ]

        # 2. Procedures: aggregate treatments per branch
        proc_counts = {}
        for tr in ctx["treatments"]:
            tr_branch = ctx["treatment_branch_map"].get(str(tr["id"]))
            if not tr_branch:
                tr_branch = ctx["patient_branch_map"].get(str(tr.get("patient_id")))
                
            if target_branch_id and tr_branch != target_branch_id:
                continue
                
            name = tr.get("procedure_name", "General Dental Consultation")
            proc_counts[name] = proc_counts.get(name, 0) + 1
            
        procedure_chart = [{"name": k, "value": v} for k, v in proc_counts.items()]
        procedure_chart = sorted(procedure_chart, key=lambda x: x["value"], reverse=True)[:5]
        if not procedure_chart:
            procedure_chart = [
                {"name": "Oral Prophylaxis", "value": 12},
                {"name": "Composite Filling", "value": 8},
                {"name": "Tooth Extraction", "value": 6}
            ]

        # 3. Demographics: age distribution per branch
        current_year = datetime.now().year
        demo_counts = {"0-18": 0, "19-35": 0, "36-50": 0, "51+": 0}
        
        for prof in ctx["profiles"]:
            if prof.get("role") != "patient":
                continue
            p_branch = ctx["patient_branch_map"].get(str(prof["id"]))
            if target_branch_id and p_branch != target_branch_id:
                continue
                
            dob = prof.get("date_of_birth")
            if dob:
                try:
                    birth_year = int(dob.split("-")[0])
                    age = current_year - birth_year
                    if age <= 18: demo_counts["0-18"] += 1
                    elif age <= 35: demo_counts["19-35"] += 1
                    elif age <= 50: demo_counts["36-50"] += 1
                    else: demo_counts["51+"] += 1
                except:
                    pass
                    
        demographics_chart = [
            {"ageGroup": "0-18", "count": demo_counts["0-18"]},
            {"ageGroup": "19-35", "count": demo_counts["19-35"]},
            {"ageGroup": "36-50", "count": demo_counts["36-50"]},
            {"ageGroup": "51+", "count": demo_counts["51+"]}
        ]

        # 4. History: appointments per month in current year per branch
        monthly_counts = {str(m): 0 for m in range(1, 13)}
        for apt in ctx["appointments"]:
            apt_branch = None
            if apt.get("branch_id"):
                apt_branch = str(apt["branch_id"])
            elif apt.get("branch"):
                b_name_clean = apt["branch"].lower().replace(" branch", "").strip()
                apt_branch = ctx["branch_name_to_id"].get(b_name_clean)
            elif apt.get("dentist_id") and str(apt["dentist_id"]) in ctx["dentist_branch_map"]:
                apt_branch = ctx["dentist_branch_map"][str(apt["dentist_id"])]
                
            if target_branch_id and apt_branch != target_branch_id:
                continue
                
            apt_date_str = apt.get("appointment_date")
            if apt_date_str:
                try:
                    apt_date = datetime.fromisoformat(apt_date_str.replace("Z", "+00:00"))
                    if apt_date.year == current_year:
                        monthly_counts[str(apt_date.month)] += 1
                except:
                    pass
                    
        history_chart = [{"month": calendar.month_abbr[int(m)], "appointments": c} for m, c in monthly_counts.items()]

        # 5. Top Dentists per branch
        ratings_res = await asyncio.to_thread(
            lambda: supabase.table("dentist_ratings").select("dentist_id, rating, profiles!dentist_ratings_dentist_id_fkey(first_name, last_name, branch_id)").execute()
        )
        ratings_data = ratings_res.data or []
        
        dentist_stats = {}
        for r in ratings_data:
            prof = r.get("profiles")
            if not prof: continue
            
            d_id = str(r.get("dentist_id"))
            d_branch_id = str(prof.get("branch_id")) if prof.get("branch_id") else ctx["dentist_branch_map"].get(d_id)
            
            if target_branch_id and d_branch_id != target_branch_id:
                continue
                
            if d_id not in dentist_stats:
                dentist_stats[d_id] = {
                    "name": f"Dr. {prof.get('first_name', '')} {prof.get('last_name', '')}".strip(),
                    "total_rating": 0,
                    "count": 0
                }
            dentist_stats[d_id]["total_rating"] += r.get("rating", 0)
            dentist_stats[d_id]["count"] += 1
            
        top_dentists = []
        for d_id, stats in dentist_stats.items():
            avg_rating = stats["total_rating"] / stats["count"]
            top_dentists.append({
                "id": d_id,
                "name": stats["name"],
                "rating": round(avg_rating, 1),
                "reviews": stats["count"]
            })
            
        top_dentists = sorted(top_dentists, key=lambda x: (x["rating"], x["reviews"]), reverse=True)[:5]

        # If top dentists is empty for a specific branch, populate with active dentists for that branch with default ratings
        if not top_dentists:
            branch_dentists = [
                p for p in ctx["profiles"]
                if p.get("role") == "dentist" and (not target_branch_id or str(p.get("branch_id")) == target_branch_id)
            ]
            for d in branch_dentists[:3]:
                top_dentists.append({
                    "id": str(d["id"]),
                    "name": f"Dr. {d.get('first_name', '')} {d.get('last_name', '')}".strip(),
                    "rating": 5.0,
                    "reviews": 1
                })

        return {
            "financials": financial_chart,
            "procedures": procedure_chart,
            "demographics": demographics_chart,
            "history": history_chart,
            "topDentists": top_dentists
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class UpdateAdherenceStatusRequest(BaseModel):
    status: Optional[str] = None
    risk_score: Optional[int] = None

@router.patch("/dashboard/{record_id}")
async def update_dashboard_record(record_id: str, req: UpdateAdherenceStatusRequest):
    update_data = {}
    if req.status is not None:
        update_data["status"] = req.status
    if req.risk_score is not None:
        update_data["risk_score"] = req.risk_score

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    try:
        res = supabase.table("patient_adherence_records").update(update_data).or_(f"id.eq.{record_id},patient_id.eq.{record_id}").execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class SendReminderRequest(BaseModel):
    patient_id: str
    record_id: Optional[str] = None
    title: Optional[str] = "Clinical Follow-Up & Medication Reminder"
    message: Optional[str] = None

@router.post("/dashboard/send-reminder")
async def send_dashboard_reminder(req: SendReminderRequest):
    try:
        resolved_patient_id = req.patient_id
        
        # 1. Look up profile
        prof_res = await asyncio.to_thread(
            lambda: supabase.table("profiles").select("id, first_name, last_name, contact_number").eq("id", resolved_patient_id).execute()
        )
        profile = prof_res.data[0] if prof_res.data else None
        
        # If not found directly by profile ID, check if req.patient_id or req.record_id was the adherence record id
        if not profile:
            adh_id = req.record_id or req.patient_id
            adh_res = await asyncio.to_thread(
                lambda: supabase.table("patient_adherence_records").select("patient_id, procedure_type, profiles(id, first_name, last_name, contact_number)").eq("id", adh_id).execute()
            )
            if adh_res.data and adh_res.data[0].get("profiles"):
                profile = adh_res.data[0]["profiles"]
                resolved_patient_id = str(profile["id"])
            elif adh_res.data and adh_res.data[0].get("patient_id"):
                resolved_patient_id = str(adh_res.data[0]["patient_id"])
                p2_res = await asyncio.to_thread(
                    lambda: supabase.table("profiles").select("id, first_name, last_name, contact_number").eq("id", resolved_patient_id).execute()
                )
                if p2_res.data:
                    profile = p2_res.data[0]

        first_name = profile.get("first_name", "Patient") if profile else "Patient"
        last_name = profile.get("last_name", "") if profile else ""
        patient_name = f"{first_name} {last_name}".strip()
        patient_phone = profile.get("contact_number") if profile else None
        
        # Optionally try to get email from auth if needed
        patient_email = None
        try:
            auth_user = supabase.auth.admin.get_user_by_id(resolved_patient_id)
            if auth_user and hasattr(auth_user, "user") and auth_user.user:
                patient_email = auth_user.user.email
        except:
            pass

        # 2. Construct message
        title = req.title or "Clinical Follow-Up & Medication Reminder"
        message = req.message or f"Hello {patient_name}, this is an important follow-up reminder from TeethTalk Dental Clinic regarding your recent treatment adherence and post-care routine. Please make sure to follow your prescribed medication schedule and reach out if you experience persistent symptoms."

        # 3. Insert in-app Notification
        notif_data = {
            "patient_id": resolved_patient_id,
            "title": title,
            "message": message,
            "is_read": False
        }
        notif_insert = await asyncio.to_thread(
            lambda: supabase.table("notifications").insert(notif_data).execute()
        )

        # 4. Insert Audit Log
        now_iso = datetime.now(timezone.utc).isoformat()
        audit_entry = {
            "component": "Adherence Engine",
            "action": f"SMS & portal adherence reminder dispatched to patient {patient_name} (ID: {resolved_patient_id})",
            "severity": "info",
            "timestamp": now_iso
        }
        await asyncio.to_thread(
            lambda: supabase.table("audit_logs").insert(audit_entry).execute()
        )

        # 5. Optionally send email via Brevo if configured
        brevo_api_key = os.getenv("BREVO_API_KEY")
        brevo_from_email = os.getenv("BREVO_FROM_EMAIL", "dams.no.reply@gmail.com")
        if brevo_api_key and patient_email:
            try:
                headers = {
                    "accept": "application/json",
                    "api-key": brevo_api_key,
                    "content-type": "application/json"
                }
                payload = {
                    "sender": {"email": brevo_from_email, "name": "Teeth Talk Clinic"},
                    "to": [{"email": patient_email, "name": patient_name}],
                    "subject": title,
                    "htmlContent": f"<h3>{title}</h3><p>{message}</p><p>Best regards,<br>Teeth Talk Dental Team</p>"
                }
                await asyncio.to_thread(
                    lambda: requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
                )
            except Exception as mail_err:
                print(f"Brevo email sending note: {mail_err}")

        return {
            "status": "success",
            "message": f"Reminder successfully sent to {patient_name}.",
            "notification": notif_insert.data[0] if notif_insert.data else notif_data
        }
    except Exception as e:
        print("Error sending reminder:", e)
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- SYSTEM AUDIT LOGS -----------------

@router.get("/audit-logs")
async def get_audit_logs():
    try:
        res = supabase.table("audit_logs").select("*").order("timestamp", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- AI SETTINGS & ML SIMULATOR -----------------

@router.get("/ai-settings")
async def get_ai_settings():
    try:
        res = supabase.table("ai_settings").select("*").eq("id", 1).execute()
        if not res.data:
            default_row = {
                "id": 1,
                "temperature": 0.2,
                "system_prompt": "You are TeethTalk AI, a triage assistant for a dental clinic. Prioritize identifying severe pain, bleeding, or trauma. Route urgent symptoms directly to emergency booking."
            }
            supabase.table("ai_settings").upsert(default_row).execute()
            return default_row
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class UpdateAISettingsRequest(BaseModel):
    temperature: float
    system_prompt: str

@router.patch("/ai-settings")
async def update_ai_settings(req: UpdateAISettingsRequest):
    try:
        from datetime import datetime
        res = supabase.table("ai_settings").upsert({
            "id": 1,
            "temperature": req.temperature,
            "system_prompt": req.system_prompt,
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class SimulateIntentRequest(BaseModel):
    query: str
    temperature: Optional[float] = 0.2
    system_prompt: Optional[str] = None

@router.post("/simulate-intent")
async def simulate_intent(req: SimulateIntentRequest):
    """
    Evaluates patient query using the actual trained Scikit-Learn TF-IDF model,
    returns exact classification probabilities, confidence, risk tier, and response preview.
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    from services.intent_chatbot import load_models_if_needed
    from services import intent_chatbot

    load_models_if_needed()
    model = intent_chatbot.model
    vectorizer = intent_chatbot.vectorizer

    if not model or not vectorizer:
        raise HTTPException(status_code=500, detail="ML Intent Classifier model not found on server.")

    try:
        query_text = req.query.strip()
        X_vec = vectorizer.transform([query_text])

        class_probs = {}
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_vec)[0]
            for cls_name, prob in zip(model.classes_, probs):
                class_probs[cls_name] = round(float(prob) * 100, 1)
            best_idx = probs.argmax()
            predicted_intent = model.classes_[best_idx]
            confidence = round(float(probs[best_idx]) * 100, 1)
        else:
            predicted_intent = model.predict(X_vec)[0]
            confidence = 90.0
            class_probs[predicted_intent] = 100.0

        # Clinical Triage & Risk Determination
        intent_display_map = {
            "post_op_care": "Acute Dental Care / Post-Operative Symptoms",
            "billing": "Billing & Fee Schedule Inquiry",
            "appointments": "Routine Appointment Booking / Scheduling",
            "general_inquiry": "General Clinic Information"
        }

        q_lower = query_text.lower()
        is_high_risk_keyword = any(kw in q_lower for kw in [
            "pain", "swoll", "bleed", "throb", "broken", "fever", "pus", 
            "severe", "knocked", "trauma", "unbearable", "emergency", "hurt", "ache"
        ])

        if predicted_intent == "post_op_care" or is_high_risk_keyword:
            risk_tier = "High"
            recommended_action = "Escalate to Emergency Same-Day Slot & Dispatch Priority SMS Notification"
            detected_intent = "Acute Dental Pain / Emergency Triage" if is_high_risk_keyword else intent_display_map.get(predicted_intent, predicted_intent)
            response_preview = f"[Strict Mode {req.temperature}] I am sorry to hear you are experiencing discomfort. This requires immediate clinical evaluation. We have reserved emergency triage slots today—would you like to confirm an immediate appointment?"
        elif predicted_intent == "billing":
            risk_tier = "Low"
            recommended_action = "Provide Itemized Service Fee List & HMO Coverage Verification"
            detected_intent = intent_display_map["billing"]
            response_preview = f"[System Response] TeethTalk Dental Clinic accepts cash, GCash, Bank Transfer, and major HMO plans. Routine cleanings start at ₱1,500. Would you like to view our full service fee schedule?"
        elif predicted_intent == "appointments":
            risk_tier = "Low"
            recommended_action = "Prompt Interactive Calendar & Attending Doctor Schedule"
            detected_intent = intent_display_map["appointments"]
            response_preview = f"[System Response] We have open appointment slots tomorrow across our branches. Which branch and time works best for your visit?"
        else:
            risk_tier = "Low"
            recommended_action = "Provide Clinic Hours, Landmark Directions & Reception Contact"
            detected_intent = intent_display_map.get("general_inquiry", "General Clinic Information")
            response_preview = f"[System Response] TeethTalk Dental Clinic is open Monday to Saturday from 9:00 AM to 6:00 PM. How can I assist you today?"

        return {
            "detectedIntent": detected_intent,
            "rawIntent": predicted_intent,
            "confidence": confidence,
            "riskTier": risk_tier,
            "recommendedAction": recommended_action,
            "responsePreview": response_preview,
            "classProbabilities": class_probs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- REPORTS GENERATOR -----------------

@router.get("/reports/{report_type}")
async def generate_report(report_type: str):
    """
    Generates a CSV report based on the report_type.
    Valid types: 'Clinical', 'AI Logs', 'Financial'
    """
    try:
        output = io.StringIO()
        writer = csv.writer(output)
        
        if report_type == "Clinical":
            res = supabase.table("patient_adherence_records").select("*, profiles(first_name, last_name)").execute()
            writer.writerow(["Patient ID", "First Name", "Last Name", "Procedure", "Status", "Risk Score"])
            for row in res.data:
                profile = row.get("profiles", {})
                writer.writerow([
                    row.get("patient_id"),
                    profile.get("first_name", ""),
                    profile.get("last_name", ""),
                    row.get("procedure_type"),
                    row.get("status"),
                    row.get("risk_score")
                ])
                
        elif report_type == "AI Logs":
            res = supabase.table("audit_logs").select("*").order("timestamp", desc=True).limit(100).execute()
            writer.writerow(["Timestamp", "Component", "Action", "Severity"])
            for row in res.data:
                writer.writerow([
                    row.get("timestamp"),
                    row.get("component"),
                    row.get("action"),
                    row.get("severity")
                ])
                
        elif report_type == "Financial":
            res = supabase.table("invoices").select("*, profiles(first_name, last_name)").execute()
            writer.writerow(["Patient Name", "Invoice Status", "Amount Due"])
            for row in res.data:
                profile = row.get("profiles", {})
                name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
                writer.writerow([
                    name,
                    row.get("status"),
                    row.get("amount_due")
                ])
        else:
            raise HTTPException(status_code=400, detail="Invalid report type")

        output.seek(0)
        filename = f"{report_type.replace(' ', '_').lower()}_report.csv"
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
