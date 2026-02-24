"""Create the partner user in Supabase Auth."""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.expanduser("~/Projects/master.env"))

from supabase import create_client

url = os.getenv("SUPABASE_URL_BAXTERLABS_STATIC_SITE")
key = os.getenv("SUPABASE_SERVICE_KEY_BAXTERLABS_STATIC_SITE")

if not url or not key:
    print("Missing SUPABASE_URL or SERVICE_KEY")
    sys.exit(1)

sb = create_client(url, key)

EMAIL = "george@baxterlabs.ai"
PASSWORD = "os.getenv("PARTNER_PASSWORD")"

try:
    result = sb.auth.admin.create_user({
        "email": EMAIL,
        "password": PASSWORD,
        "email_confirm": True,
    })
    print(f"Partner user created successfully!")
    print(f"  Email: {EMAIL}")
    print(f"  User ID: {result.user.id}")
except Exception as e:
    error_str = str(e)
    if "already been registered" in error_str or "already exists" in error_str:
        print(f"User {EMAIL} already exists — no action needed.")
        print(f"  Email: {EMAIL}")
    else:
        print(f"Error creating user: {e}")
        sys.exit(1)
