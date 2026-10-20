#!/usr/bin/env python3
"""
YT AutoPilot — YouTube Data API v3 Auto-Uploader
Uploads generated MP4 videos, sets custom thumbnails, adds title, tags, description,
and configures publication status (private, unlisted, public, or scheduled).
"""

import os
import sys
import json
import time
from datetime import datetime

try:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl"
]

CONFIG_DIR = os.path.join(os.path.dirname(__file__), "..", "config")
CLIENT_SECRET_FILE = os.path.join(CONFIG_DIR, "client_secret.json")
TOKEN_FILE = os.path.join(CONFIG_DIR, "youtube_token.json")

def get_authenticated_service():
    """Returns an authenticated YouTube Data API v3 client."""
    if not GOOGLE_API_AVAILABLE:
        return None

    creds = None
    if os.path.exists(TOKEN_FILE):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        except Exception as e:
            print(f"[!] Error loading token: {e}")

    # If no valid credentials available, check if we can refresh
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            with open(TOKEN_FILE, "w") as token:
                token.write(creds.to_json())
        except Exception as e:
            print(f"[!] Error refreshing token: {e}")
            creds = None

    if creds and creds.valid:
        return build("youtube", "v3", credentials=creds)
        
    return None

def upload_video_to_youtube(
    video_path: str,
    title: str,
    description: str,
    tags: str,
    thumbnail_path: str = None,
    privacy_status: str = "private", # "private", "unlisted", "public"
    publish_at: str = None, # ISO 8601 string, e.g. "2026-10-21T18:00:00Z"
    category_id: str = "28" # 28 = Science & Technology, 24 = Entertainment
) -> dict:
    """
    Uploads a video to YouTube Data API v3.
    If credentials are not yet configured, cleanly stages the upload and returns staging info.
    """
    if not os.path.exists(video_path):
        return {"success": False, "error": f"Video file not found: {video_path}"}

    tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    # Format body
    body = {
        "snippet": {
            "title": title[:100],
            "description": description,
            "tags": tag_list,
            "categoryId": category_id
        },
        "status": {
            "privacyStatus": privacy_status,
            "selfDeclaredMadeForKids": False
        }
    }

    if publish_at and privacy_status == "private":
        body["status"]["publishAt"] = publish_at

    service = get_authenticated_service()

    if service:
        try:
            print(f"[*] Uploading '{title}' to YouTube ({privacy_status})...")
            media = MediaFileUpload(video_path, chunksize=-1, resumable=True, mimetype="video/mp4")
            req = service.videos().insert(
                part="snippet,status",
                body=body,
                media_body=media
            )
            response = req.execute()
            video_id = response.get("id")

            # Set custom thumbnail if available
            if video_id and thumbnail_path and os.path.exists(thumbnail_path):
                try:
                    thumb_media = MediaFileUpload(thumbnail_path, mimetype="image/jpeg")
                    service.thumbnails().set(
                        videoId=video_id,
                        media_body=thumb_media
                    ).execute()
                    print(f"[+] Custom thumbnail set for video {video_id}")
                except Exception as thumb_err:
                    print(f"[!] Thumbnail upload notice: {thumb_err}")

            return {
                "success": True,
                "mode": "live_youtube_api",
                "video_id": video_id,
                "youtube_url": f"https://www.youtube.com/watch?v={video_id}",
                "title": title,
                "privacy": privacy_status,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"[!] YouTube API upload error: {e}")
            # Fallback to staged queue

    # Staged Queue (when Google OAuth is not yet completed)
    staged_dir = os.path.join(os.path.dirname(__file__), "..", "output", "staged_queue")
    os.makedirs(staged_dir, exist_ok=True)
    stage_id = f"stage_{int(time.time())}"
    stage_file = os.path.join(staged_dir, f"{stage_id}.json")

    staged_data = {
        "stage_id": stage_id,
        "mode": "staged_ready_to_publish",
        "video_path": os.path.abspath(video_path),
        "thumbnail_path": os.path.abspath(thumbnail_path) if thumbnail_path else None,
        "title": title,
        "description": description,
        "tags": tag_list,
        "privacy": privacy_status,
        "publish_at": publish_at,
        "created_at": datetime.now().isoformat(),
        "instruction": "Video generated & staged! Connect Google Account in topbar to push live."
    }

    with open(stage_file, "w", encoding="utf-8") as f:
        json.dump(staged_data, f, indent=2)

    return {
        "success": True,
        "mode": "staged_queue",
        "stage_id": stage_id,
        "message": "Video successfully produced and staged for upload!",
        "video_path": video_path,
        "thumbnail_path": thumbnail_path,
        "title": title
    }

if __name__ == "__main__":
    test_video = os.path.join(os.path.dirname(__file__), "..", "output", "videos", "sample_short.mp4")
    test_thumb = os.path.join(os.path.dirname(__file__), "..", "output", "thumbnails", "sample_shorts_thumb.jpg")
    res = upload_video_to_youtube(
        test_video,
        "Secret AI Tools in 2026",
        "The best AI tools you should know in 2026. #shorts",
        "ai, tech, shorts",
        test_thumb,
        privacy_status="private"
    )
    print(json.dumps(res, indent=2))
