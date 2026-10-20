#!/usr/bin/env python3
"""
YT AutoPilot — One-Click YouTube Authorization Script
Opens your browser (Chrome) to authorize your YouTube channel (e.g. mdsa134867@gmail.com)
and saves the credentials to config/youtube_token.json for 100% automated uploads.
"""

import os
import sys
import json
import webbrowser

# Ensure Windows terminal UTF-8 encoding
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_DIR = os.path.join(BASE_DIR, "config")
CLIENT_SECRET_FILE = os.path.join(CONFIG_DIR, "client_secret.json")
TOKEN_FILE = os.path.join(CONFIG_DIR, "youtube_token.json")

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl"
]

def check_or_authorize(account_hint="mdsa134867@gmail.com"):
    print("=======================================================")
    print("🔐 YT AutoPilot — YouTube Channel Authorization")
    print(f"Target Account: {account_hint}")
    print("=======================================================\n")

    if not os.path.exists(CLIENT_SECRET_FILE):
        print("[-] Missing: config/client_secret.json\n")
        print("To enable direct automated uploads from your account:")
        print(f"1. Open Chrome with your '{account_hint}' profile.")
        print("2. Visit Google Cloud Console: https://console.cloud.google.com/apis/dashboard")
        print("3. Click '+ ENABLE APIS AND SERVICES' and enable 'YouTube Data API v3'.")
        print("4. Go to 'Credentials' -> 'Create Credentials' -> 'OAuth client ID'.")
        print("   - Application type: 'Desktop app'")
        print("   - Name: 'YT AutoPilot Uploader'")
        print("5. Click 'Download JSON' and save the downloaded file as:")
        print(f"   {CLIENT_SECRET_FILE}\n")
        print("6. Re-run this script to open the Google Sign-In prompt and save your token!")
        return False

    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
        flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
        print("[*] Launching browser to authorize YouTube upload permissions...")
        creds = flow.run_local_server(port=8090, prompt="consent", login_hint=account_hint)

        os.makedirs(CONFIG_DIR, exist_ok=True)
        with open(TOKEN_FILE, "w", encoding="utf-8") as f:
            f.write(creds.to_json())

        print(f"\n[SUCCESS] Token saved successfully to {TOKEN_FILE}!")
        print(f"[+] Your YouTube account ({account_hint}) is now linked for automated uploads.\n")
        return True
    except Exception as e:
        print(f"[!] Authorization error: {e}")
        return False

if __name__ == "__main__":
    hint = sys.argv[1] if len(sys.argv) > 1 else "mdsa134867@gmail.com"
    check_or_authorize(hint)
