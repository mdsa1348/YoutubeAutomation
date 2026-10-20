#!/usr/bin/env python3
"""
YT AutoPilot — AI Script & Packaging Engine
Generates retention-engineered scripts, high-CTR titles, SEO tags, descriptions, and pinned comments.
Supports Groq (Llama 3.3), Google Gemini 1.5 Pro, and intelligent offline templates.
"""

import os
import sys
import json
import re
import requests

def call_groq(prompt: str, api_key: str, model: str = "llama-3.3-70b-versatile") -> str:
    """Calls Groq LPU inference for sub-300ms completions."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a master YouTube Shorts retention scriptwriter and algorithm packaging specialist. Output strictly clean JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "response_format": {"type": "json_object"}
    }
    res = requests.post(url, headers=headers, json=payload, timeout=20)
    if res.status_code == 200:
        data = res.json()
        return data["choices"][0]["message"]["content"]
    else:
        raise Exception(f"Groq API error {res.status_code}: {res.text}")

def call_gemini(prompt: str, api_key: str) -> str:
    """Calls Google Gemini 1.5 Pro."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt + "\n\nRespond with strict JSON."}]}]
    }
    res = requests.post(url, headers=headers, json=payload, timeout=30)
    if res.status_code == 200:
        data = res.json()
        txt = data["candidates"][0]["content"]["parts"][0]["text"]
        # extract JSON if wrapped in markdown
        m = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', txt)
        return m.group(1) if m else txt
    else:
        raise Exception(f"Gemini API error {res.status_code}: {res.text}")

def generate_viral_package(topic: str, groq_key: str = None, gemini_key: str = None, duration_target: str = "45s") -> dict:
    """
    Generates a full video packaging:
    - best_title, titles (list)
    - voiceover_script (30-60s script ready for Edge-TTS)
    - description (SEO optimized)
    - tags (500 char comma separated)
    - pinned_comment
    - badge_text
    """
    groq_key = groq_key or os.environ.get("GROQ_API_KEY", "")
    gemini_key = gemini_key or os.environ.get("GEMINI_API_KEY", "")

    prompt = f"""
Create a viral, high-retention YouTube Short package for the topic: "{topic}".
Target runtime: {duration_target} (roughly 80 to 120 spoken words).

Return a strict JSON object with this exact schema:
{{
  "title": "Primary high-CTR title with numbers, power words and curiosity (under 60 chars)",
  "badge_text": "2-3 word shocking badge text (e.g. 'DO NOT IGNORE', '100% FREE', 'AI EXPOSED')",
  "titles": ["Title option 1", "Title option 2", "Title option 3", "Title option 4", "Title option 5"],
  "voiceover_script": "The exact full text for the voiceover. Must have: 1. Shocking 3-second hook that breaks patterns. 2. 3 rapid-fire points or story twists. 3. Call to action. 4. Seamless loop ending that naturally flows back into the first line without feeling abrupt. DO NOT include stage directions like [Music] or (Visual) - ONLY plain words that the voiceover will speak aloud.",
  "description": "SEO optimized description with 3 hashtags, summary, and subscribe CTA",
  "tags": "Comma-separated YouTube studio tags up to 450 characters",
  "pinned_comment": "Engaging polarizing question for the pinned comment to maximize comment count"
}}
"""
    result = None

    # Try Groq first (fastest)
    if groq_key:
        try:
            raw = call_groq(prompt, groq_key)
            result = json.loads(raw)
        except Exception as e:
            print(f"[!] Groq call failed: {e}")

    # Try Gemini next
    if not result and gemini_key:
        try:
            raw = call_gemini(prompt, gemini_key)
            result = json.loads(raw)
        except Exception as e:
            print(f"[!] Gemini call failed: {e}")

    # Fallback to smart algorithmic template if no API keys configured
    if not result:
        clean_topic = topic.strip()
        result = {
            "title": f"Stop Doing This! The {clean_topic} Secret (2026)",
            "badge_text": "DON'T MISS THIS",
            "titles": [
                f"The Untold Truth About {clean_topic} in 2026",
                f"Why 99% Of People Fail At {clean_topic}",
                f"I Tested {clean_topic} For 30 Days (Crazy Results)",
                f"This {clean_topic} Trick Feels Completely Illegal",
                f"The Biggest {clean_topic} Secret Nobody Tells You"
            ],
            "voiceover_script": (
                f"This single secret about {clean_topic} will completely change how you see the world in 2026. "
                f"First, most people make the fatal mistake of doing things the old, slow way. "
                f"Second, top insiders use an automated shortcut that saves them hundreds of hours every single week. "
                f"And third, you can implement this exact blueprint today for free. "
                f"Subscribe right now for the full breakdown, because..."
            ),
            "description": f"The complete guide and secret breakdown to {clean_topic}. Learn how to leverage this trend before everyone else.\n\n#shorts #{clean_topic.replace(' ', '')} #trending",
            "tags": f"{clean_topic}, {clean_topic} tutorial, {clean_topic} 2026, how to, viral shorts, ai automation, tech secrets, productivity tips",
            "pinned_comment": f"Did you know about this secret? Drop your thoughts below and subscribe for part 2! 👇"
        }

    return result

if __name__ == "__main__":
    pkg = generate_viral_package("Secret AI Tools in 2026")
    print(json.dumps(pkg, indent=2))
