import os
import random
from datetime import datetime, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from supabase import create_client, Client
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv

# Load .env from the root directory (d:\DAMS\.env)
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(env_path)

router = APIRouter()

# Supabase init
supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 

if not supabase_url or not supabase_key:
    # Fallback to anon key if service role is missing, but service role is better
    supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")

supabase: Client = create_client(supabase_url, supabase_key)

class OTPRequest(BaseModel):
    user_id: str
    email: str

class OTPVerify(BaseModel):
    email: str
    otp_code: str

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

@router.post("/send-otp")
async def send_otp(req: OTPRequest):
    email = req.email
    user_id = req.user_id
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    # Store in Supabase
    try:
        # Delete any existing OTPs for this email to prevent spam
        supabase.table("email_verifications").delete().eq("email", email).execute()
        
        supabase.table("email_verifications").insert({
            "user_id": user_id,
            "email": email,
            "otp_code": otp_code,
            "expires_at": expires_at.isoformat()
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # Send via SendGrid
    sg_api_key = os.getenv("SENDGRID_API_KEY")
    sg_from_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@teethtalk.com")
    
    if not sg_api_key:
        print(f"DEBUG ONLY (No SendGrid Key): OTP for {email} is {otp_code}")
        return {"message": "OTP generated (Check server console, SendGrid not configured)"}

    message = Mail(
        from_email=sg_from_email,
        to_emails=email,
        subject='Your Teeth Talk Clinic Verification Code',
        html_content=f'<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;"><h2>Welcome to Teeth Talk Dental Clinic</h2><p>Your verification code is:</p><h1 style="background: #f4f4f5; padding: 10px; letter-spacing: 5px; font-size: 32px; border-radius: 8px;">{otp_code}</h1><p>This code expires in 15 minutes.</p></div>'
    )
    
    try:
        sg = SendGridAPIClient(sg_api_key)
        sg.send(message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    return {"message": "OTP sent successfully"}

@router.post("/verify-otp")
async def verify_otp(req: OTPVerify):
    email = req.email
    otp_code = req.otp_code
    
    # Fetch valid OTP from Supabase
    res = supabase.table("email_verifications") \
        .select("*") \
        .eq("email", email) \
        .eq("otp_code", otp_code) \
        .gte("expires_at", datetime.utcnow().isoformat()) \
        .execute()
        
    records = res.data
    if not records:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
        
    verification_record = records[0]
    user_id = verification_record["user_id"]
    
    # Update user profile
    try:
        supabase.table("profiles").update({"is_email_verified": True}).eq("id", user_id).execute()
        
        # Delete the OTP record so it can't be reused
        supabase.table("email_verifications").delete().eq("id", verification_record["id"]).execute()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error during profile update: {str(e)}")

    return {"message": "Email verified successfully", "user_id": user_id}

class CreateStaffRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    role: str

@router.post("/create-staff")
async def create_staff(req: CreateStaffRequest):
    # Ensure role is valid
    if req.role not in ["receptionist", "dentist", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'receptionist', 'dentist', or 'admin'.")
        
    try:
        response = supabase.auth.admin.create_user({
            "email": req.email,
            "password": req.password,
            "email_confirm": True, # Must be True so they can log in to trigger our custom OTP flow
            "user_metadata": {
                "first_name": req.first_name,
                "last_name": req.last_name,
                "role": req.role
            }
        })
        
        user = response.user
        if user:
            # Send welcome email with temporary password via SendGrid
            sg_api_key = os.getenv("SENDGRID_API_KEY")
            sg_from_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@teethtalk.com")
            
            if sg_api_key:
                html_content = f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
                    <h2>Welcome to Teeth Talk Dental Clinic</h2>
                    <p>An administrator has created a new account for you.</p>
                    <p>Your login email is: <strong>{req.email}</strong></p>
                    <p>Your temporary password is: <strong>{req.password}</strong></p>
                    <p>Please log in at your earliest convenience. You will be prompted to verify your email address via a secure code.</p>
                </div>
                """
                message = Mail(
                    from_email=sg_from_email,
                    to_emails=req.email,
                    subject='Welcome to Teeth Talk - Your Account Credentials',
                    html_content=html_content
                )
                try:
                    sg = SendGridAPIClient(sg_api_key)
                    sg.send(message)
                except Exception as e:
                    print(f"Failed to send welcome email: {str(e)}")
            
        return {"message": "Account created successfully! Welcome email sent.", "user": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create account: {str(e)}")

class ToggleStatusRequest(BaseModel):
    user_id: str
    is_active: bool

@router.post("/toggle-status")
async def toggle_status(req: ToggleStatusRequest):
    try:
        supabase.table("profiles").update({"is_active": req.is_active}).eq("id", req.user_id).execute()
        return {"message": "Account status updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update account status: {str(e)}")

class UpdateContactRequest(BaseModel):
    user_id: str
    contact_number: str
    address: str

@router.post("/update-contact")
async def update_contact(req: UpdateContactRequest):
    try:
        # Update profiles table
        supabase.table("profiles").update({"contact_number": req.contact_number}).eq("id", req.user_id).execute()
        
        # Update patient_profiles table
        supabase.table("patient_profiles").update({"address": req.address}).eq("patient_id", req.user_id).execute()
        
        return {"message": "Contact details updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update contact details: {str(e)}")

class DeleteAccountRequest(BaseModel):
    user_id: str

@router.post("/delete-account")
async def delete_account(req: DeleteAccountRequest):
    try:
        response = supabase.auth.admin.delete_user(req.user_id)
        return {"message": "Account permanently deleted."}
    except Exception as e:
        err_msg = str(e).lower()
        if "foreign key constraint" in err_msg or "violates foreign key" in err_msg:
            raise HTTPException(status_code=400, detail="Cannot delete this account because it has existing records tied to it. Please disable the account instead.")
        raise HTTPException(status_code=400, detail=f"Failed to delete account: {str(e)}")
