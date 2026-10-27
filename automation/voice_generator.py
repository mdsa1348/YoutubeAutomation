#!/usr/bin/env python3
"""
YT AutoPilot — Neural Voiceover Engine (Edge-TTS)
Generates high-definition, natural human voiceover with synchronized word-level timestamps.
100% Free, zero API key required.
"""

import asyncio
import os
import sys
import json
import re
import edge_tts

DEFAULT_VOICE = "en-US-ChristopherNeural"

VOICE_CATALOG = {
    "christopher": "en-US-ChristopherNeural",   # Authoritative, storytelling, documentary
    "guy": "en-US-GuyNeural",                   # Energetic, casual, tech reviews
    "jenny": "en-US-JennyNeural",               # Friendly, engaging, lifestyle & educational
    "aria": "en-US-AriaNeural",                 # Professional, clear news & explainers
    "ryan": "en-GB-RyanNeural",                 # British sophistication & history
    "eric": "en-US-EricNeural"                  # Fast-paced Shorts & curiosity hooks
}

def split_srt_into_punchy_cues(raw_srt: str, words_per_cue: int = 4) -> str:
    """
    Transforms long subtitle sentences into punchy 3-5 word fast-paced cues for YouTube Shorts.
    """
    if not raw_srt or not raw_srt.strip():
        return raw_srt or ""
        
    blocks = re.split(r'\n\s*\n', raw_srt.strip())
    new_cues = []
    cue_idx = 1
    
    def parse_time(t_str):
        h, m, s = t_str.split(':')
        s, ms = s.split(',')
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0

    def format_time(seconds):
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int(round((seconds - int(seconds)) * 1000))
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
        time_line = lines[1]
        text_line = " ".join(lines[2:]).strip()
        
        m = re.match(r'(\d\d:\d\d:\d\d,\d\d\d)\s*-->\s*(\d\d:\d\d:\d\d,\d\d\d)', time_line)
        if not m:
            continue
        start_sec = parse_time(m.group(1))
        end_sec = parse_time(m.group(2))
        total_duration = max(0.5, end_sec - start_sec)
        
        words = text_line.split()
        if not words:
            continue
            
        chunks = [words[i:i + words_per_cue] for i in range(0, len(words), words_per_cue)]
        sec_per_word = total_duration / len(words)
        
        curr_start = start_sec
        for chunk in chunks:
            chunk_duration = len(chunk) * sec_per_word
            curr_end = curr_start + chunk_duration
            chunk_text = " ".join(chunk).upper()
            
            new_cues.append(f"{cue_idx}\n{format_time(curr_start)} --> {format_time(curr_end)}\n{chunk_text}\n")
            cue_idx += 1
            curr_start = curr_end

    return "\n".join(new_cues)

async def generate_voiceover(text: str, output_audio_path: str, voice_name: str = DEFAULT_VOICE, output_subtitles_path: str = None) -> dict:
    """
    Converts text to an MP3 file and extracts precise word timing for subtitles.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_audio_path)), exist_ok=True)
    voice = VOICE_CATALOG.get(voice_name.lower(), voice_name)
    
    communicate = edge_tts.Communicate(text, voice)
    submaker = edge_tts.SubMaker()
    
    with open(output_audio_path, "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])
            elif chunk["type"] in ("WordBoundary", "SentenceBoundary"):
                submaker.feed(chunk)
                
    # Get raw SRT and convert to punchy Shorts cues
    raw_srt = submaker.get_srt()
    punchy_srt = split_srt_into_punchy_cues(raw_srt, words_per_cue=4)
    
    if output_subtitles_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_subtitles_path)), exist_ok=True)
        with open(output_subtitles_path, "w", encoding="utf-8") as f:
            f.write(punchy_srt)

    return {
        "success": True,
        "audio_path": output_audio_path,
        "subtitles_path": output_subtitles_path,
        "voice": voice,
        "srt": punchy_srt
    }

def run_tts(text: str, audio_path: str, voice: str = "christopher", srt_path: str = None):
    return asyncio.run(generate_voiceover(text, audio_path, voice, srt_path))

if __name__ == "__main__":
    test_text = "This secret AI tool will replace video editors in 2026, and nobody is talking about it. Here is how you can use it right now."
    out_audio = os.path.join(os.path.dirname(__file__), "..", "output", "audio", "sample_voice.mp3")
    out_srt = os.path.join(os.path.dirname(__file__), "..", "output", "audio", "sample_voice.srt")
    res = run_tts(test_text, out_audio, "christopher", out_srt)
    print(json.dumps(res, indent=2))
