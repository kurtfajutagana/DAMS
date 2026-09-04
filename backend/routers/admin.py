from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.db import supabase
from fastapi.responses import StreamingResponse
import io
import csv
import asyncio

router = APIRouter()

# ----------------- ADMIN DASHBOARD -----------------

@router.get("/dashboard")
async def get_dashboard_records():
    try:
        # Run queries concurrently using asyncio.to_thread since supabase-py is synchronous
        def fetch_records():
            return supabase.table("patient_adherence_records").select("*, profiles(first_name, last_name, contact_number)").execute()
            
        def fetch_patients_count():
            # Use limit(1) to avoid downloading all rows, just get the exact count header
            return supabase.table("profiles").select("id", count="exact").eq("role", "patient").limit(1).execute()
            
        def fetch_chat_count():
            return supabase.table("chatbot_logs").select("id", count="exact").limit(1).execute()
            
        def fetch_pending_billing():
            return supabase.table("invoices").select("id", count="exact").eq("status", "pending_verification").execute()
            
        # Execute in parallel
        res, patients_res, chat_res, billing_res = await asyncio.gather(
            asyncio.to_thread(fetch_records),
            asyncio.to_thread(fetch_patients_count),
            asyncio.to_thread(fetch_chat_count),
            asyncio.to_thread(fetch_pending_billing)
        )
        
        active_today = patients_res.count if patients_res.count else 0
        ai_conversations = chat_res.count if chat_res.count else 0
        pending_billing = billing_res.count if billing_res.count else 0

        return {
            "records": res.data,
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

        # Base filter helper
        def apply_branch(query, branch_col="branch_id"):
            if branch_id and branch_id != "All Branches":
                return query.eq(branch_col, branch_id)
            return query

        # 1. Financials: aggregate invoices by status
        # Invoices might not have branch_id directly, but we can assume they do or get it via patient.
        # Let's just fetch all and filter in python if needed, or assume branch_id doesn't exist on invoices.
        # Actually, invoices don't have branch_id in schema. We will just aggregate all for now or skip branch filter for financials.
        invoices_res = supabase.table("invoices").select("status, amount_due").execute()
        financials = {"paid": 0, "pending": 0, "verifying": 0}
        for inv in invoices_res.data:
            amt = inv.get("amount_due") or 0
            st = inv.get("status")
            if st == "paid": financials["paid"] += amt
            elif st == "pending_verification": financials["verifying"] += amt
            else: financials["pending"] += amt
            
        financial_chart = [
            {"name": "Paid", "value": financials["paid"]},
            {"name": "Pending", "value": financials["pending"]},
            {"name": "Verifying", "value": financials["verifying"]}
        ]

        # 2. Procedures
        treatments_query = supabase.table("treatments").select("procedure_name")
        # treatments doesn't have branch_id either. 
        treatments_res = treatments_query.execute()
        proc_counts = {}
        for tr in treatments_res.data:
            name = tr.get("procedure_name", "Unknown")
            proc_counts[name] = proc_counts.get(name, 0) + 1
            
        procedure_chart = [{"name": k, "value": v} for k, v in proc_counts.items()]
        procedure_chart = sorted(procedure_chart, key=lambda x: x["value"], reverse=True)[:5]

        # 3. Demographics
        profiles_query = supabase.table("profiles").select("date_of_birth").eq("role", "patient")
        profiles_res = profiles_query.execute()
        current_year = datetime.now().year
        demo_counts = {"0-18": 0, "19-35": 0, "36-50": 0, "51+": 0}
        
        for prof in profiles_res.data:
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

        # 4. History (Appointments per month for current year)
        appointments_query = supabase.table("appointments").select("appointment_date, branch_id")
        appointments_query = apply_branch(appointments_query, "branch_id")
        appointments_res = appointments_query.execute()
        
        monthly_counts = {str(m): 0 for m in range(1, 13)}
        for apt in appointments_res.data:
            apt_date_str = apt.get("appointment_date")
            if apt_date_str:
                try:
                    apt_date = datetime.fromisoformat(apt_date_str.replace("Z", "+00:00"))
                    if apt_date.year == current_year:
                        monthly_counts[str(apt_date.month)] += 1
                except:
                    pass
                    
        history_chart = [{"month": calendar.month_abbr[int(m)], "appointments": c} for m, c in monthly_counts.items()]

        # 5. Top Dentists
        ratings_query = supabase.table("dentist_ratings").select("dentist_id, rating, profiles!dentist_ratings_dentist_id_fkey(first_name, last_name, branch_id)")
        ratings_res = ratings_query.execute()
        
        dentist_stats = {}
        for r in ratings_res.data:
            prof = r.get("profiles")
            if not prof: continue
            
            d_branch_id = prof.get("branch_id")
            if branch_id and branch_id != "All Branches" and d_branch_id != branch_id:
                continue
                
            d_id = r.get("dentist_id")
            if d_id not in dentist_stats:
                dentist_stats[d_id] = {
                    "name": f"Dr. {prof.get('first_name')} {prof.get('last_name')}",
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
            
        top_dentists = sorted(top_dentists, key=lambda x: x["rating"], reverse=True)[:5]

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
        res = supabase.table("patient_adherence_records").update(update_data).eq("id", record_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- SYSTEM AUDIT LOGS -----------------

@router.get("/audit-logs")
async def get_audit_logs():
    try:
        res = supabase.table("audit_logs").select("*").order("timestamp", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- AI SETTINGS -----------------

@router.get("/ai-settings")
async def get_ai_settings():
    try:
        res = supabase.table("ai_settings").select("*").eq("id", 1).execute()
        if not res.data:
            return {"temperature": 0.2, "system_prompt": "Default prompt"}
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class UpdateAISettingsRequest(BaseModel):
    temperature: float
    system_prompt: str

@router.patch("/ai-settings")
async def update_ai_settings(req: UpdateAISettingsRequest):
    try:
        res = supabase.table("ai_settings").update({
            "temperature": req.temperature,
            "system_prompt": req.system_prompt
        }).eq("id", 1).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
