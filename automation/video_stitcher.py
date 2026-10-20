#!/usr/bin/env python3
"""
YT AutoPilot — Automated Video Stitcher Engine (FFmpeg)
Assembles 9:16 vertical 1080x1920 YouTube Shorts with kinetic styled subtitles and dynamic background visuals.
"""

import os
import sys
import subprocess
import json
import re
import imageio_ffmpeg

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

def srt_to_ass(srt_path: str, ass_path: str, primary_color="&H0024E0FF", outline_color="&H00000000"):
    """
    Converts SRT to high-retention styled ASS format (MrBeast / Hormozi yellow/cyan style).
    Colors are &HAABBGGRR in ASS:
      - Bright Gold/Yellow: &H0000E5FF or &H0024E0FF
      - Pure White: &H00FFFFFF
      - Pure Black: &H00000000
    """
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ShortsDefault,Impact,80,&H00FFFFFF,&H000000FF,{outline_color},&H80000000,-1,0,0,0,100,100,2,0,1,6,3,2,60,60,780,1
Style: ShortsHighlight,Impact,88,{primary_color},&H000000FF,{outline_color},&H80000000,-1,0,0,0,105,105,2,0,1,7,4,2,60,60,780,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    if not os.path.exists(srt_path):
        return False

    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()

    blocks = re.split(r'\n\s*\n', content.strip())
    dialogues = []

    def srt_time_to_ass(t):
        # SRT: 00:00:01,766 -> ASS: 0:00:01.76
        t = t.replace(',', '.')
        parts = t.split(':')
        h = int(parts[0])
        m = parts[1]
        s = float(parts[2])
        return f"{h}:{m}:{s:05.2f}"

    for i, block in enumerate(blocks):
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
        m = re.match(r'(\d\d:\d\d:\d\d,\d\d\d)\s*-->\s*(\d\d:\d\d:\d\d,\d\d\d)', lines[1])
        if not m:
            continue
        start_ass = srt_time_to_ass(m.group(1))
        end_ass = srt_time_to_ass(m.group(2))
        text = " ".join(lines[2:]).strip()

        # Alternate highlight for active emphasis
        style = "ShortsHighlight" if (i % 2 == 0) else "ShortsDefault"
        dialogues.append(f"Dialogue: 0,{start_ass},{end_ass},{style},,0,0,0,,{text}")

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(header + "\n".join(dialogues) + "\n")

    return True

def get_media_duration(file_path: str) -> float:
    """Gets audio or video duration in seconds."""
    cmd = [
        FFMPEG_EXE, "-i", file_path
    ]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", res.stderr)
    if m:
        h, mn, s = m.groups()
        return int(h) * 3600 + int(mn) * 60 + float(s)
    return 10.0 # fallback

def render_short_video(
    audio_path: str,
    srt_path: str,
    output_video_path: str,
    background_video_path: str = None,
    watermark_text: str = "YT AutoPilot"
) -> dict:
    """
    Renders 1080x1920 vertical MP4 video with synced subtitles and animated background.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_video_path)), exist_ok=True)
    duration = get_media_duration(audio_path)
    
    # Generate ASS subtitle file
    ass_path = output_video_path.replace(".mp4", ".ass")
    srt_to_ass(srt_path, ass_path)

    # Windows safe path for FFmpeg subtitle filter (escape colons and backslashes)
    ass_filter_path = ass_path.replace("\\", "/").replace(":", "\\:")

    # Prepare video source:
    # If custom background video provided, loop and crop to 1080x1920
    # Otherwise, generate high-retention procedural animated plasma/cyber gradient background
    # Auto-detect background video in assets/backgrounds if none specified
    if not background_video_path or not os.path.exists(background_video_path):
        bg_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "backgrounds")
        if os.path.exists(bg_dir):
            bg_files = [os.path.join(bg_dir, f) for f in os.listdir(bg_dir) if f.lower().endswith(('.mp4', '.mov', '.webm'))]
            if bg_files:
                background_video_path = bg_files[0]

    if background_video_path and os.path.exists(background_video_path):
        input_args = [
            "-stream_loop", "-1",
            "-i", background_video_path,
            "-i", audio_path
        ]
        video_filter = (
            f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
            f"drawbox=x=0:y=0:w=1080:h=1920:color=black@0.35:t=fill,"
            f"subtitles='{ass_filter_path}'[v]"
        )
    else:
        # Ultra-fast animated dark cyber gradient canvas (540x960 upscaled to 1080x1920 for 4x speed)
        input_args = [
            "-f", "lavfi",
            "-i", f"testsrc2=size=540x960:rate=30",
            "-i", audio_path
        ]
        video_filter = (
            f"[0:v]scale=1080:1920:flags=bicubic,hue=s=1.6:h=t*25,"
            f"boxblur=lr=16:lp=4,"
            f"drawbox=x=0:y=0:w=1080:h=1920:color=black@0.50:t=fill,"
            f"subtitles='{ass_filter_path}'[v]"
        )

    cmd = [
        FFMPEG_EXE, "-y",
        *input_args,
        "-filter_complex", video_filter,
        "-map", "[v]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", f"{duration + 0.5:.2f}",
        "-pix_fmt", "yuv420p",
        output_video_path
    ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    if os.path.exists(output_video_path) and os.path.getsize(output_video_path) > 1000:
        return {
            "success": True,
            "video_path": output_video_path,
            "duration": duration,
            "size_bytes": os.path.getsize(output_video_path),
            "resolution": "1080x1920"
        }
    else:
        # Fallback to simpler direct render if mandelbrot filter isn't optimal on some setups
        simple_input = [
            "-f", "lavfi",
            "-i", f"color=c=#0f172a:s=1080x1920:r=30",
            "-i", audio_path
        ]
        simple_filter = (
            f"[0:v]subtitles='{ass_filter_path}'[v]"
        )
        fallback_cmd = [
            FFMPEG_EXE, "-y",
            *simple_input,
            "-filter_complex", simple_filter,
            "-map", "[v]",
            "-map", "1:a",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-c:a", "aac",
            "-t", f"{duration + 0.5:.2f}",
            "-pix_fmt", "yuv420p",
            output_video_path
        ]
        fallback_res = subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return {
            "success": os.path.exists(output_video_path),
            "video_path": output_video_path,
            "duration": duration,
            "size_bytes": os.path.getsize(output_video_path) if os.path.exists(output_video_path) else 0,
            "resolution": "1080x1920",
            "log": fallback_res.stderr[-500:] if not os.path.exists(output_video_path) else "OK"
        }

if __name__ == "__main__":
    audio = os.path.join(os.path.dirname(__file__), "..", "output", "audio", "sample_voice.mp3")
    srt = os.path.join(os.path.dirname(__file__), "..", "output", "audio", "sample_voice.srt")
    out_mp4 = os.path.join(os.path.dirname(__file__), "..", "output", "videos", "sample_short.mp4")
    
    print("[*] Testing Video Stitcher...")
    result = render_short_video(audio, srt, out_mp4)
    print(json.dumps(result, indent=2))
