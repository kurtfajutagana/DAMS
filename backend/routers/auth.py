import os
import random
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from supabase import create_client, Client
import requests
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
    email: str
    user_id: str = None

class OTPVerify(BaseModel):
    email: str
    otp_code: str

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

@router.post("/send-otp")
async def send_otp(req: OTPRequest):
    email = req.email.strip()
    user_id = req.user_id
    
    if not user_id:
        try:
            ev_res = supabase.table("email_verifications").select("user_id").eq("email", email).order("created_at", desc=True).limit(1).execute()
            if ev_res.data:
                user_id = ev_res.data[0]["user_id"]
        except Exception as e:
            print(f"Note: Could not resolve user_id from email_verifications: {e}")
            
    if not user_id:
        user_id = str(uuid.uuid4())
            
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

    # Send via Brevo (Sendinblue)
    brevo_api_key = os.getenv("BREVO_API_KEY")
    brevo_from_email = os.getenv("BREVO_FROM_EMAIL", "dams.no.reply@gmail.com")
    
    if not brevo_api_key:
        print(f"DEBUG ONLY (No Brevo Key): OTP for {email} is {otp_code}")
        return {"message": "OTP generated (Check server console, Brevo not configured)"}

    html_content = f'<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;"><h2>Welcome to Teeth Talk Dental Clinic</h2><p>Your verification code is:</p><h1 style="background: #f4f4f5; padding: 10px; letter-spacing: 5px; font-size: 32px; border-radius: 8px;">{otp_code}</h1><p>This code expires in 15 minutes.</p></div>'

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": brevo_api_key,
        "content-type": "application/json"
    }
    payload = {
        "sender": {"email": brevo_from_email, "name": "Teeth Talk Clinic"},
        "to": [{"email": email}],
        "subject": "Your Teeth Talk Clinic Verification Code",
        "htmlContent": html_content
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        print(f"Successfully sent OTP to {email} via Brevo.")
    except Exception as e:
        print(f"Brevo failed: {str(e)}")
        if isinstance(e, requests.exceptions.HTTPError):
            print(f"Brevo API Error Response: {e.response.text}")
        print(f"DEBUG ONLY (Brevo Error): OTP for {email} is {otp_code}")

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

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyResetOTPRequest(BaseModel):
    email: str
    otp_code: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp_code: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    email = req.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")

    # 1. Search auth users for matching email
    user_id = None
    first_name = "Valued User"
    try:
        all_users = supabase.auth.admin.list_users(per_page=1000)
        target_user = next((u for u in all_users if u.email and u.email.strip().lower() == email), None)
        if target_user:
            user_id = target_user.id
            if target_user.user_metadata and target_user.user_metadata.get("first_name"):
                first_name = target_user.user_metadata["first_name"]
    except Exception as e:
        print(f"Error listing auth users: {e}")

    # Fallback search in email_verifications
    if not user_id:
        try:
            ev_res = supabase.table("email_verifications").select("user_id").eq("email", email).order("created_at", desc=True).limit(1).execute()
            if ev_res.data:
                user_id = ev_res.data[0]["user_id"]
        except Exception:
            pass

    if not user_id:
        raise HTTPException(
            status_code=404, 
            detail="No account was found with this email address. Please verify your email or sign up."
        )

    # 2. Check if account is active in profiles
    try:
        prof_res = supabase.table("profiles").select("is_active, first_name").eq("id", user_id).limit(1).execute()
        if prof_res.data and len(prof_res.data) > 0:
            prof = prof_res.data[0]
            if prof.get("is_active") is False:
                raise HTTPException(status_code=403, detail="This account has been deactivated. Please contact clinic administration.")
            if prof.get("first_name"):
                first_name = prof["first_name"]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Warning checking profile status: {e}")

    # 3. Generate 6-digit OTP & store with 15-min expiry
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    try:
        # Delete prior OTPs for this email to prevent collisions
        supabase.table("email_verifications").delete().eq("email", email).execute()

        supabase.table("email_verifications").insert({
            "user_id": user_id,
            "email": email,
            "otp_code": otp_code,
            "expires_at": expires_at.isoformat()
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error storing verification code: {str(e)}")

    # 4. Construct professional branded email
    brevo_api_key = os.getenv("BREVO_API_KEY")
    brevo_from_email = os.getenv("BREVO_FROM_EMAIL", "dams.no.reply@gmail.com")
    gmail_password = os.getenv("GMAIL_APP_PASSWORD")

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password - Teeth Talk Dental Clinic</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Teeth Talk Dental Clinic</h1>
      <p style="margin: 8px 0 0; color: #ccfbf1; font-size: 14px;">Intelligent Dental Care &amp; Clinical Portal</p>
    </div>
    <div style="padding: 32px 28px;">
      <h2 style="margin: 0 0 12px; font-size: 20px; color: #0f172a; font-weight: 600;">Password Reset Code</h2>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.5; color: #475569;">
        Hello <strong>{first_name}</strong>,
      </p>
      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: #475569;">
        We received a request to reset the password for your Teeth Talk Clinic account. Use the 6-digit verification code below to authorize your password change:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <div style="display: inline-block; background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 16px 36px; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #0f766e; font-family: monospace;">
          {otp_code}
        </div>
      </div>
      <p style="margin: 0 0 16px; font-size: 13px; color: #64748b; text-align: center;">
        &#9201; This code will securely expire in <strong>15 minutes</strong>.
      </p>
      <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin-top: 24px;">
        <p style="margin: 0; font-size: 13px; color: #b45309; line-height: 1.4;">
          <strong>Security Notice:</strong> If you did not request a password reset, you can safely ignore this email. Your existing credentials remain completely secure.
        </p>
      </div>
    </div>
    <div style="border-top: 1px solid #f1f5f9; padding: 20px 24px; background: #fafafa; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">
        &copy; 2026 Teeth Talk Dental Clinic. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>"""

    email_sent = False
    brevo_error_msg = None

    if brevo_api_key:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "api-key": brevo_api_key,
                "content-type": "application/json"
            }
            payload = {
                "sender": {"email": brevo_from_email, "name": "Teeth Talk Dental Clinic"},
                "to": [{"email": email, "name": first_name}],
                "subject": "Teeth Talk Clinic - Password Reset Verification Code",
                "htmlContent": html_content
            }
            res = requests.post(url, json=payload, headers=headers, timeout=10)
            if not res.ok:
                brevo_error_msg = res.text
                print(f"Brevo API error response: {res.status_code} - {res.text}")
            res.raise_for_status()
            email_sent = True
            print(f"Successfully sent password reset OTP to {email} via Brevo.")
        except Exception as be:
            if not brevo_error_msg:
                brevo_error_msg = str(be)
            print(f"Brevo email dispatch failed: {be}")

    if not email_sent and gmail_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Teeth Talk Clinic - Password Reset Verification Code"
            msg["From"] = brevo_from_email
            msg["To"] = email
            msg.attach(MIMEText(html_content, "html"))
            
            server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
            server.starttls()
            server.login(brevo_from_email, gmail_password)
            server.sendmail(brevo_from_email, email, msg.as_string())
            server.quit()
            email_sent = True
            print(f"Successfully sent password reset email to {email} via Gmail SMTP.")
        except Exception as smtp_err:
            print(f"Gmail SMTP dispatch failed: {smtp_err}")

    if not email_sent:
        if brevo_error_msg and ("unrecognised IP address" in brevo_error_msg or "authorised_ips" in brevo_error_msg):
            detail_msg = "Brevo rejected email delivery because of IP restrictions. Please authorise your IP address (136.158.33.103) in Brevo at https://app.brevo.com/security/authorised_ips or disable IP restriction."
        elif brevo_error_msg:
            detail_msg = f"Email delivery failed: {brevo_error_msg}"
        elif not brevo_api_key and not gmail_password:
            detail_msg = "Email delivery service is not configured. Please add a valid BREVO_API_KEY in .env."
        else:
            detail_msg = "Failed to deliver verification code to your email. Please try again or contact clinic administration."
            
        raise HTTPException(status_code=502, detail=detail_msg)

    return {"message": "A 6-digit verification code has been sent to your email address."}

@router.post("/verify-reset-otp")
async def verify_reset_otp(req: VerifyResetOTPRequest):
    email = req.email.strip().lower()
    otp_code = req.otp_code.strip()

    if not email or not otp_code:
        raise HTTPException(status_code=400, detail="Email and 6-digit verification code are required.")

    res = supabase.table("email_verifications") \
        .select("id, expires_at") \
        .eq("email", email) \
        .eq("otp_code", otp_code) \
        .gte("expires_at", datetime.utcnow().isoformat()) \
        .execute()

    if not res.data:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code. Please check and try again.")

    return {"message": "Verification code confirmed successfully.", "valid": True}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    email = req.email.strip().lower()
    otp_code = req.otp_code.strip()
    new_password = req.new_password

    if not email or not otp_code or not new_password:
        raise HTTPException(status_code=400, detail="Email, verification code, and new password are required.")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    # 1. Fetch valid OTP from email_verifications
    res = supabase.table("email_verifications") \
        .select("*") \
        .eq("email", email) \
        .eq("otp_code", otp_code) \
        .gte("expires_at", datetime.utcnow().isoformat()) \
        .execute()

    records = res.data
    if not records:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code. Please request a new code.")

    verification_record = records[0]
    user_id = verification_record["user_id"]

    # 2. Update password in Supabase Auth
    try:
        supabase.auth.admin.update_user_by_id(user_id, {
            "password": new_password
        })
    except Exception as e:
        print(f"Failed to update password in auth: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update password: {str(e)}")

    # 3. Clean up OTP record so it cannot be reused
    try:
        supabase.table("email_verifications").delete().eq("id", verification_record["id"]).execute()
    except Exception as e:
        print(f"Warning deleting used OTP: {e}")

    # 4. Mark email as verified if needed
    try:
        supabase.table("profiles").update({"is_email_verified": True}).eq("id", user_id).execute()
    except Exception as e:
        print(f"Note updating is_email_verified: {e}")

    # 5. Audit log
    try:
        supabase.table("audit_logs").insert({
            "component": "AUTH",
            "action": f"Password reset successfully for {email}",
            "severity": "INFO"
        }).execute()
    except Exception:
        pass

    return {"message": "Your password has been reset successfully! You can now sign in with your new password."}


class CreateStaffRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    role: str
    branch_id: str = None

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
            if req.branch_id:
                try:
                    supabase.table("profiles").update({"branch_id": req.branch_id}).eq("id", user.id).execute()
                except Exception as db_e:
                    print(f"Warning: Failed to set branch_id on profile: {str(db_e)}")
                    
            # Send welcome email with temporary password via Brevo / SMTP
            brevo_api_key = os.getenv("BREVO_API_KEY")
            brevo_from_email = os.getenv("BREVO_FROM_EMAIL", "dams.no.reply@gmail.com")
            
            html_content = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
                <h2>Welcome to Teeth Talk Dental Clinic</h2>
                <p>An administrator has created a new account for you.</p>
                <p>Your login email is: <strong>{req.email}</strong></p>
                <p>Your temporary password is: <strong>{req.password}</strong></p>
                <p>Please log in at your earliest convenience. You will be prompted to verify your email address via a secure code.</p>
            </div>
            """

            if brevo_api_key:
                try:
                    url = "https://api.brevo.com/v3/smtp/email"
                    headers = {
                        "accept": "application/json",
                        "api-key": brevo_api_key,
                        "content-type": "application/json"
                    }
                    payload = {
                        "sender": {"email": brevo_from_email, "name": "Teeth Talk Clinic"},
                        "to": [{"email": req.email}],
                        "subject": "Welcome to Teeth Talk - Your Account Credentials",
                        "htmlContent": html_content
                    }
                    b_res = requests.post(url, json=payload, headers=headers)
                    b_res.raise_for_status()
                    print(f"Successfully sent staff credentials to {req.email} via Brevo.")
                except Exception as be:
                    print(f"Failed to send welcome email via Brevo: {str(be)}")
            else:
                gmail_password = os.getenv("GMAIL_APP_PASSWORD")
                if gmail_password:
                    try:
                        msg = MIMEMultipart("alternative")
                        msg["Subject"] = "Welcome to Teeth Talk - Your Account Credentials"
                        msg["From"] = brevo_from_email
                        msg["To"] = req.email
                        msg.attach(MIMEText(html_content, "html"))
                        
                        server = smtplib.SMTP("smtp.gmail.com", 587)
                        server.starttls()
                        server.login(brevo_from_email, gmail_password)
                        server.sendmail(brevo_from_email, req.email, msg.as_string())
                        server.quit()
                        print(f"Successfully sent welcome email to {req.email} via Gmail SMTP.")
                    except Exception as smtp_error:
                        print(f"Failed to send welcome email via SMTP: {str(smtp_error)}")
            
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

class UpdateProfileRequest(BaseModel):
    user_id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None

@router.post("/update-profile")
async def update_profile(req: UpdateProfileRequest):
    try:
        update_data = {}
        if req.first_name is not None:
            update_data["first_name"] = req.first_name
        if req.last_name is not None:
            update_data["last_name"] = req.last_name
        if req.contact_number is not None:
            update_data["contact_number"] = req.contact_number
        if req.address is not None:
            update_data["address"] = req.address
        if req.date_of_birth is not None:
            update_data["date_of_birth"] = req.date_of_birth or None
        if req.gender is not None:
            update_data["gender"] = req.gender

        if update_data:
            supabase.table("profiles").update(update_data).eq("id", req.user_id).execute()
        return {"message": "Profile updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update profile: {str(e)}")

class UpdateStaffRequest(BaseModel):
    user_id: str
    first_name: str
    last_name: str
    role: str
    branch_id: Optional[str] = None
    specialization: Optional[str] = None
    license_number: Optional[str] = None

@router.post("/update-staff")
async def update_staff(req: UpdateStaffRequest):
    try:
        update_data = {
            "first_name": req.first_name,
            "last_name": req.last_name,
            "role": req.role,
            "branch_id": req.branch_id if req.branch_id else None,
            "specialization": req.specialization,
            "license_number": req.license_number
        }
        supabase.table("profiles").update(update_data).eq("id", req.user_id).execute()
        
        # Try syncing Supabase auth user metadata
        try:
            supabase.auth.admin.update_user_by_id(req.user_id, {
                "user_metadata": {
                    "first_name": req.first_name,
                    "last_name": req.last_name,
                    "role": req.role
                }
            })
        except Exception as auth_e:
            print(f"Warning: Failed to sync auth user_metadata: {str(auth_e)}")
            
        return {"message": "Staff account updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update staff account: {str(e)}")

class UpdateContactRequest(BaseModel):
    user_id: str
    contact_number: str
    address: str

@router.post("/update-contact")
async def update_contact(req: UpdateContactRequest):
    try:
        # Update profiles table
        supabase.table("profiles").update({
            "contact_number": req.contact_number,
            "address": req.address
        }).eq("id", req.user_id).execute()
        
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
