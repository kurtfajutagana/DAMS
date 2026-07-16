import asyncio
import os
from dotenv import load_dotenv, find_dotenv
from supabase import create_client, Client

load_dotenv(find_dotenv(), override=True)

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Missing Supabase Service Role Key!")
    exit(1)

supabase: Client = create_client(url, key)

def reset_admin_password():
    print("Fetching admin profile...")
    try:
        # Find the admin user in the profiles table
        res = supabase.table("profiles").select("*").eq("role", "admin").execute()
        if not res.data:
            print("No admin user found in profiles table.")
            return

        admin_profile = res.data[0]
        admin_id = admin_profile["id"]
        
        # Get the email from auth.users via admin API
        user_res = supabase.auth.admin.get_user_by_id(admin_id)
        admin_email = user_res.user.email

        new_password = "AdminPassword123!"
        print(f"Found admin with email: {admin_email}")
        print("Resetting password...")

        # Update the password directly bypassing email verification
        supabase.auth.admin.update_user_by_id(admin_id, attributes={"password": new_password})
        
        print(f"\n✅ Success! Admin password has been reset.")
        print(f"Email: {admin_email}")
        print(f"New Password: {new_password}")
        print("\nYou can now log in using these credentials.")
        
    except Exception as e:
        print(f"Error resetting admin password: {e}")

if __name__ == "__main__":
    reset_admin_password()
